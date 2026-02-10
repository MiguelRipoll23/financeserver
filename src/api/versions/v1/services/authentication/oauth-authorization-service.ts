import { inject, injectable } from "@needle-di/core";
import { ServerError } from "../../models/server-error.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  oauthAuthorizationCodes,
  oauthConnections,
} from "../../../../../db/schema.ts";
import { eq, lt } from "drizzle-orm";
import type {
  OAuthRevokeRequest,
  OAuthTokenRequest,
  OAuthTokenResponse,
} from "../../schemas/oauth-schemas.ts";
import type { OAuthRequestData } from "../../interfaces/authentication/oauth-request-data-interface.ts";
import type { AuthenticationPrincipal } from "../../types/authentication/authentication-principal-type.ts";
import { OAuthClientRegistryService } from "./oauth-client-registry-service.ts";
import { Base64Utils } from "../../../../../core/utils/base64-utils.ts";
import { UrlUtils } from "../../../../../core/utils/url-utils.ts";
import { OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS, OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS } from "../../../../../core/constants/oauth-constants.ts";

@injectable()
export class OAuthAuthorizationService {
  private readonly authorizationCodeTtlMs = 5 * 60 * 1000;
  private readonly refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private clientRegistry = inject(OAuthClientRegistryService),
    private databaseService = inject(DatabaseService),
  ) {}

  public async assertClient(clientId: string): Promise<void> {
    if (await this.clientRegistry.isClientRegistered(clientId)) {
      return;
    }

    throw new ServerError(
      "INVALID_OAUTH_CLIENT",
      "Unsupported OAuth client",
      400,
    );
  }

  public async assertRedirectUri(
    clientId: string,
    redirectUri: string,
  ): Promise<void> {
    const normalized = this.normalizeUrl(redirectUri);
    const client = await this.clientRegistry.getClient(clientId);

    if (client === null || !client.redirectUris.includes(normalized)) {
      throw new ServerError(
        "INVALID_OAUTH_REDIRECT_URI",
        "Redirect URI is not allowed",
        400,
      );
    }
  }

  public async createAuthorizationCode(
    request: OAuthRequestData,
    principal: AuthenticationPrincipal,
  ): Promise<string> {
    const code = Base64Utils.generateRandomString(32);
    const accessToken = Base64Utils.generateRandomString(32);
    const expiresAt = new Date(Date.now() + this.authorizationCodeTtlMs);

    // Store authorization code in database
    await this.databaseService.get().insert(oauthAuthorizationCodes).values({
      code,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      scope: request.scope,
      accessToken,
      tokenType: "Bearer",
      user: {
        id: principal.passkeyId,
        displayName: principal.displayName,
      },
      resource: request.resource,
      expiresAt: expiresAt.toISOString(),
    });

    // Build redirect URL with authorization code
    const redirectUrl = new URL(request.redirectUri);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", request.state);
    redirectUrl.searchParams.set("scope", request.scope);

    return redirectUrl.toString();
  }

  public async exchangeAuthorizationCode(
    tokenRequest: OAuthTokenRequest,
  ): Promise<OAuthTokenResponse> {
    if (tokenRequest.grant_type === "authorization_code") {
      return await this.handleAuthorizationCodeGrant(tokenRequest);
    } else if (tokenRequest.grant_type === "refresh_token") {
      return await this.handleRefreshTokenGrant(tokenRequest);
    } else {
      throw new ServerError(
        "UNSUPPORTED_OAUTH_GRANT",
        "Unsupported OAuth grant type",
        400,
      );
    }
  }

  private async handleAuthorizationCodeGrant(
    request: Extract<OAuthTokenRequest, { grant_type: "authorization_code" }>,
  ): Promise<OAuthTokenResponse> {
    await this.assertClient(request.client_id);
    await this.assertRedirectUri(request.client_id, request.redirect_uri);

    const record = await this.consumeAuthorizationCode(request.code);

    if (record.clientId !== request.client_id) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "Invalid OAuth client identifier",
        400,
      );
    }

    if (record.redirectUri !== this.normalizeUrl(request.redirect_uri)) {
      throw new ServerError(
        "INVALID_OAUTH_REDIRECT_URI",
        "Invalid OAuth redirect URI",
        400,
      );
    }

    await this.verifyCodeVerifier(record.codeChallenge, request.code_verifier);

    // Generate tokens
    const refreshToken = Base64Utils.generateRandomString(32);
    const accessToken = Base64Utils.generateRandomString(32);
    const expiresAt = new Date(Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000);

    // Store connection
    await this.databaseService.get().insert(oauthConnections).values({
      refreshToken,
      accessToken,
      clientId: request.client_id,
      scope: record.scope,
      tokenType: "Bearer",
      user: record.user,
      resource: record.resource,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      scope: record.scope,
      expires_in: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refresh_token: refreshToken,
      user: record.user as { id: string; displayName: string },
    };
  }

  private async handleRefreshTokenGrant(
    request: Extract<OAuthTokenRequest, { grant_type: "refresh_token" }>,
  ): Promise<OAuthTokenResponse> {
    await this.assertClient(request.client_id);

    // Find connection by refresh token
    const connections = await this.databaseService
      .get()
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.refreshToken, request.refresh_token))
      .limit(1);

    if (connections.length === 0) {
      throw new ServerError(
        "INVALID_REFRESH_TOKEN",
        "Invalid refresh token",
        400,
      );
    }

    const connection = connections[0];

    if (connection.clientId !== request.client_id) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "Invalid OAuth client identifier",
        400,
      );
    }

    // Generate new tokens
    const newAccessToken = Base64Utils.generateRandomString(32);
    const newRefreshToken = Base64Utils.generateRandomString(32);
    const expiresAt = new Date(Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000);

    // Update connection
    await this.databaseService
      .get()
      .update(oauthConnections)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
      })
      .where(eq(oauthConnections.id, connection.id));

    return {
      access_token: newAccessToken,
      token_type: "Bearer",
      scope: connection.scope,
      expires_in: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refresh_token: newRefreshToken,
      user: connection.user as { id: string; displayName: string },
    };
  }

  public async revokeToken(request: OAuthRevokeRequest): Promise<void> {
    await this.assertClient(request.client_id);

    // Try to delete from connections
    const deleted = await this.databaseService
      .get()
      .delete(oauthConnections)
      .where(eq(oauthConnections.refreshToken, request.token))
      .returning({ id: oauthConnections.id });

    if (deleted.length === 0) {
      // Token might be an access token, try that
      await this.databaseService
        .get()
        .delete(oauthConnections)
        .where(eq(oauthConnections.accessToken, request.token));
    }
  }

  private async consumeAuthorizationCode(code: string): Promise<{
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    user: unknown;
    resource?: string | null;
  }> {
    const records = await this.databaseService
      .get()
      .select()
      .from(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.code, code))
      .limit(1);

    if (records.length === 0) {
      throw new ServerError(
        "INVALID_OAUTH_CODE",
        "Invalid OAuth authorization code",
        400,
      );
    }

    const record = records[0];

    if (new Date(record.expiresAt) < new Date()) {
      await this.databaseService
        .get()
        .delete(oauthAuthorizationCodes)
        .where(eq(oauthAuthorizationCodes.code, code));

      throw new ServerError(
        "EXPIRED_OAUTH_CODE",
        "OAuth authorization code has expired",
        400,
      );
    }

    // Delete the code (one-time use)
    await this.databaseService
      .get()
      .delete(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.code, code));

    return record;
  }

  private async verifyCodeVerifier(
    codeChallenge: string,
    codeVerifier: string,
  ): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const computedChallenge = Base64Utils.arrayBufferToBase64Url(hashBuffer);

    if (computedChallenge !== codeChallenge) {
      throw new ServerError(
        "INVALID_CODE_VERIFIER",
        "Invalid PKCE code verifier",
        400,
      );
    }
  }

  private normalizeUrl(url: string): string {
    const urlObj = new URL(url);
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith("/")) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    return urlObj.toString();
  }

  public async cleanupExpiredCodes(): Promise<void> {
    const now = new Date().toISOString();
    await this.databaseService
      .get()
      .delete(oauthAuthorizationCodes)
      .where(lt(oauthAuthorizationCodes.expiresAt, now));
  }

  public async validateAccessToken(accessToken: string): Promise<{
    clientId: string;
    scope: string;
    user: unknown;
    resource?: string | null;
  } | null> {
    const connections = await this.databaseService
      .get()
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.accessToken, accessToken))
      .limit(1);

    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];

    // Check if token is expired
    if (new Date(connection.expiresAt) < new Date()) {
      return null;
    }

    return {
      clientId: connection.clientId,
      scope: connection.scope,
      user: connection.user,
      resource: connection.resource,
    };
  }

  public async validateTokenResource(
    accessToken: string,
    requestUrl: string,
    requestPath: string,
  ): Promise<void> {
    const connection = await this.validateAccessToken(accessToken);

    if (!connection) {
      throw new ServerError("INVALID_TOKEN", "Token not found or expired", 401);
    }

    // If token has a resource claim, validate it matches the requested endpoint
    if (connection.resource) {
      const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
      const requestedResource = new URL(
        requestPath,
        applicationBaseURL,
      ).toString();

      // Normalize both URLs for comparison (remove trailing slashes, etc.)
      const normalizedTokenResource = this.normalizeUrl(connection.resource);
      const normalizedRequestedResource = this.normalizeUrl(requestedResource);

      if (normalizedTokenResource !== normalizedRequestedResource) {
        throw new ServerError(
          "INVALID_TOKEN_AUDIENCE",
          "Token is not valid for this resource",
          403,
        );
      }
    }
  }
}

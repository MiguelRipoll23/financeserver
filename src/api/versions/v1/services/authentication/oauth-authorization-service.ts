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
import type { AuthenticationPrincipal } from "../../../../../core/interfaces/authentication/authentication-principal-interface.ts";
import { OAuthClientRegistryService } from "./oauth-client-registry-service.ts";
import { Base64Utils } from "../../../../../core/utils/base64-utils.ts";
import { TokenHashUtils } from "../../../../../core/utils/token-hash-utils.ts";
import { UrlUtils } from "../../../../../core/utils/url-utils.ts";
import {
  OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "../../../../../core/constants/oauth-constants.ts";

@injectable()
export class OAuthAuthorizationService {
  private readonly authorizationCodeTtlMs = 5 * 60 * 1000;

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

    if (
      client === null ||
      !client.redirectUris
        .map((uri) => this.normalizeUrl(uri))
        .includes(normalized)
    ) {
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
    const codeHash = await TokenHashUtils.hashToken(code);
    const expiresAt = new Date(Date.now() + this.authorizationCodeTtlMs);

    // Store authorization code in database with hashed token
    await this.databaseService
      .get()
      .insert(oauthAuthorizationCodes)
      .values({
        codeHash,
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        codeChallenge: request.codeChallenge,
        codeChallengeMethod: request.codeChallengeMethod,
        scope: request.scope,
        tokenType: "Bearer",
        user: {
          id: principal.id,
          displayName: principal.displayName,
        },
        resource: request.resource,
        expiresAt: expiresAt.toISOString(),
      });

    // Build redirect URL with authorization code (raw token returned to client)
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
    const refreshTokenHash = await TokenHashUtils.hashToken(refreshToken);
    const accessToken = Base64Utils.generateRandomString(32);
    const accessTokenHash = await TokenHashUtils.hashToken(accessToken);
    const expiresAt = new Date(
      Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000,
    );

    // Store connection with hashed tokens
    await this.databaseService.get().insert(oauthConnections).values({
      refreshTokenHash,
      accessTokenHash,
      clientId: request.client_id,
      scope: record.scope,
      tokenType: "Bearer",
      user: record.user,
      resource: record.resource,
      expiresAt: expiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
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

    const refreshTokenHash = await TokenHashUtils.hashToken(
      request.refresh_token,
    );

    // Find connection by refresh token hash
    const connections = await this.databaseService
      .get()
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.refreshTokenHash, refreshTokenHash))
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

    // Check if refresh token is expired
    if (new Date(connection.refreshTokenExpiresAt) < new Date()) {
      throw new ServerError(
        "INVALID_REFRESH_TOKEN",
        "Refresh token has expired",
        400,
      );
    }

    // Generate new tokens
    const newAccessToken = Base64Utils.generateRandomString(32);
    const newAccessTokenHash = await TokenHashUtils.hashToken(newAccessToken);
    const newRefreshToken = Base64Utils.generateRandomString(32);
    const newRefreshTokenHash = await TokenHashUtils.hashToken(newRefreshToken);
    const expiresAt = new Date(
      Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      Date.now() + OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000,
    );

    // Update connection with hashed tokens
    await this.databaseService
      .get()
      .update(oauthConnections)
      .set({
        accessTokenHash: newAccessTokenHash,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: expiresAt.toISOString(),
        refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
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

    const tokenHash = await TokenHashUtils.hashToken(request.token);

    // Try to delete from connections using refresh token hash
    const deleted = await this.databaseService
      .get()
      .delete(oauthConnections)
      .where(eq(oauthConnections.refreshTokenHash, tokenHash))
      .returning({ id: oauthConnections.id });

    if (deleted.length === 0) {
      // Token might be an access token, try that
      await this.databaseService
        .get()
        .delete(oauthConnections)
        .where(eq(oauthConnections.accessTokenHash, tokenHash));
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
    const codeHash = await TokenHashUtils.hashToken(code);

    // Atomically delete and return the authorization code record
    const records = await this.databaseService
      .get()
      .delete(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.codeHash, codeHash))
      .returning();

    if (records.length === 0) {
      throw new ServerError(
        "INVALID_OAUTH_CODE",
        "Invalid OAuth authorization code",
        400,
      );
    }

    const record = records[0];

    if (new Date(record.expiresAt) < new Date()) {
      throw new ServerError(
        "EXPIRED_OAUTH_CODE",
        "OAuth authorization code has expired",
        400,
      );
    }

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
    const accessTokenHash = await TokenHashUtils.hashToken(accessToken);

    const connections = await this.databaseService
      .get()
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.accessTokenHash, accessTokenHash))
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

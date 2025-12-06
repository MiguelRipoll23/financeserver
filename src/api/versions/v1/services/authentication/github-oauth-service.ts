import { inject, injectable } from "@needle-di/core";
import { ServerError } from "../../models/server-error.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  oauthAuthorizationCodes,
  oauthConnections,
} from "../../../../../db/schema.ts";
import { eq, lt } from "drizzle-orm";
import {
  ENV_GITHUB_CLIENT_ID,
  ENV_GITHUB_CLIENT_SECRET,
  ENV_GITHUB_OAUTH_SCOPE,
} from "../../constants/environment-constants.ts";
import {
  GITHUB_API_BASE_URL,
  GITHUB_OAUTH_ACCESS_TOKEN_URL,
  GITHUB_OAUTH_AUTHORIZE_URL,
  GITHUB_OAUTH_CALLBACK_PATH,
} from "../../constants/oauth-constants.ts";
import { OAUTH_SCOPES_SUPPORTED } from "../../../../../core/constants/oauth-constants.ts";
import type { GitHubUser } from "../../interfaces/authentication/github-user-interface.ts";
import { type GitHubAccessTokenError } from "../../interfaces/authentication/github-access-token-error-interface.ts";
import { type GitHubAccessTokenResponse } from "../../interfaces/authentication/github-access-token-response-interface.ts";
import type { AuthorizationStatePayload } from "../../interfaces/authentication/authorization-state-payload-interface.ts";
import type { AuthorizationCodeRecord } from "../../interfaces/authentication/authorization-code-record-interface.ts";
import type { RefreshTokenRecord } from "../../interfaces/authentication/refresh-token-record-interface.ts";
import type {
  AuthorizationCodeRecordInputType,
  RefreshTokenRecordInputType,
} from "../../types/authentication/oauth-record-types.ts";
import {
  type GitHubCallbackQuery,
  type OAuthAuthorizeQuery,
  type OAuthTokenRequest,
  type OAuthTokenResponse,
  type OAuthRevokeRequest,
} from "../../schemas/authentication-schemas.ts";
import { Base64Utils } from "../../../../../core/utils/base64-utils.ts";
import { OAuthClientRegistryService } from "./oauth-client-registry-service.ts";
import { UrlUtils } from "../../../../../core/utils/url-utils.ts";

@injectable()
export class GitHubOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly requestedScope: string;
  private readonly clientRegistry: OAuthClientRegistryService;
  private readonly databaseService: DatabaseService;
  private readonly authorizationCodeTtlMs = 5 * 60 * 1000;
  private readonly refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly stateAlgorithm: HmacImportParams = {
    name: "HMAC",
    hash: "SHA-256",
  };
  private readonly stateTtlMs = 5 * 60 * 1000;
  private stateKeyPromise: Promise<CryptoKey> | null = null;

  constructor(
    clientRegistry = inject(OAuthClientRegistryService),
    databaseService = inject(DatabaseService)
  ) {
    this.clientId = this.getEnvironmentVariable(ENV_GITHUB_CLIENT_ID);
    this.clientSecret = this.getEnvironmentVariable(ENV_GITHUB_CLIENT_SECRET);
    const applicationBaseURL = UrlUtils.getApplicationBaseURL();
    this.redirectUri = new URL(
      GITHUB_OAUTH_CALLBACK_PATH,
      applicationBaseURL
    ).toString();
    this.requestedScope = this.getOptionalEnvironmentVariable(
      ENV_GITHUB_OAUTH_SCOPE,
      "read:user"
    );
    this.clientRegistry = clientRegistry;
    this.databaseService = databaseService;
  }

  public async getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
    await this.assertTokenValidity(accessToken);
    return await this.fetchUser(accessToken);
  }

  public async validateTokenResource(
    accessToken: string,
    requestPath: string
  ): Promise<void> {
    // Look up the token in oauth_connections to get its resource claim
    const records = await this.databaseService
      .get()
      .select({ resource: oauthConnections.resource })
      .from(oauthConnections)
      .where(eq(oauthConnections.accessToken, accessToken))
      .limit(1);

    if (records.length === 0) {
      throw new ServerError("INVALID_TOKEN", "Token not found or expired", 401);
    }

    const tokenResource = records[0].resource;

    // If token has a resource claim, validate it matches the requested endpoint
    if (tokenResource) {
      const applicationBaseURL = UrlUtils.getApplicationBaseURL();
      const requestedResource = new URL(
        requestPath,
        applicationBaseURL
      ).toString();

      // Normalize both URLs for comparison (remove trailing slashes, etc.)
      const normalize = (url: string) => {
        const urlObj = new URL(url);
        if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith("/")) {
          urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        return urlObj.toString();
      };
      const normalizedTokenResource = normalize(tokenResource);
      const normalizedRequestedResource = normalize(requestedResource);

      if (normalizedTokenResource !== normalizedRequestedResource) {
        throw new ServerError(
          "INVALID_TOKEN_AUDIENCE",
          "Token is not valid for this resource",
          403
        );
      }
    }
  }

  public async createAuthorizationRedirect(
    query: OAuthAuthorizeQuery
  ): Promise<string> {
    await this.assertClient(query.client_id);
    await this.assertRedirectUri(query.client_id, query.redirect_uri);

    const scope = this.resolveScope(query.scope);
    const stateToken = await this.createSignedState({
      nonce: crypto.randomUUID(),
      iat: Date.now(),
      clientState: query.state,
      clientId: query.client_id,
      redirectUri: this.normalizeUrl(query.redirect_uri),
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method,
      scope,
      resource: query.resource,
    });

    const authorizeUrl = new URL(GITHUB_OAUTH_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", this.clientId);
    authorizeUrl.searchParams.set("redirect_uri", this.redirectUri);
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", stateToken);
    authorizeUrl.searchParams.set("allow_signup", "false");

    return authorizeUrl.toString();
  }

  public async createCallbackRedirect(
    query: GitHubCallbackQuery
  ): Promise<string> {
    const statePayload = await this.parseSignedState(query.state);
    await this.assertClient(statePayload.clientId);
    await this.assertRedirectUri(
      statePayload.clientId,
      statePayload.redirectUri
    );

    if (query.error !== undefined) {
      return this.createErrorRedirect(statePayload, query);
    }

    if (query.code === undefined) {
      throw new ServerError(
        "INVALID_OAUTH_CODE",
        "Missing OAuth authorization code",
        400
      );
    }

    const token = await this.exchangeGitHubCodeForToken(query.code);
    const user = await this.getAuthenticatedUser(token.access_token);
    console.info("OAuth login succeeded", {
      clientId: statePayload.clientId,
      login: user.login,
    });
    const authorizationCode = await this.storeAuthorizationCode({
      clientId: statePayload.clientId,
      redirectUri: statePayload.redirectUri,
      codeChallenge: statePayload.codeChallenge,
      codeChallengeMethod: statePayload.codeChallengeMethod,
      scope: statePayload.scope,
      accessToken: token.access_token,
      tokenType:
        typeof token.token_type === "string"
          ? token.token_type.charAt(0).toUpperCase() +
            token.token_type.slice(1).toLowerCase()
          : "Bearer",
      user,
      resource: statePayload.resource,
    });

    const redirectUrl = new URL(statePayload.redirectUri);
    redirectUrl.searchParams.set("code", authorizationCode);
    redirectUrl.searchParams.set("state", statePayload.clientState);
    redirectUrl.searchParams.set("scope", statePayload.scope);

    return redirectUrl.toString();
  }

  public async exchangeAuthorizationCode(
    request: OAuthTokenRequest
  ): Promise<OAuthTokenResponse> {
    if (request.grant_type === "authorization_code") {
      return await this.handleAuthorizationCodeGrant(request);
    } else if (request.grant_type === "refresh_token") {
      return await this.handleRefreshTokenGrant(request);
    } else {
      throw new ServerError(
        "UNSUPPORTED_OAUTH_GRANT",
        "Unsupported OAuth grant type",
        400
      );
    }
  }

  private async handleAuthorizationCodeGrant(
    request: Extract<OAuthTokenRequest, { grant_type: "authorization_code" }>
  ): Promise<OAuthTokenResponse> {
    await this.assertClient(request.client_id);
    await this.assertRedirectUri(request.client_id, request.redirect_uri);

    const record = await this.consumeAuthorizationCode(request.code);

    if (record.clientId !== request.client_id) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "Invalid OAuth client identifier",
        400
      );
    }

    if (record.redirectUri !== this.normalizeUrl(request.redirect_uri)) {
      throw new ServerError(
        "INVALID_OAUTH_REDIRECT_URI",
        "Invalid OAuth redirect URI",
        400
      );
    }

    // TODO: Re-enable resource parameter validation per RFC 8707 once ChatGPT supports it
    // Validate resource parameter per RFC 8707
    // Normalize URLs to handle trailing slashes and other variations
    // const normalizeResourceUrl = (url: string | undefined) => {
    //   if (!url) return undefined;
    //   const urlObj = new URL(url);
    //   if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith("/")) {
    //     urlObj.pathname = urlObj.pathname.slice(0, -1);
    //   }
    //   return urlObj.toString();
    // };

    // const normalizedRequestResource = normalizeResourceUrl(request.resource);
    // const normalizedRecordResource = normalizeResourceUrl(record.resource);

    // if (normalizedRequestResource !== normalizedRecordResource) {
    //   throw new ServerError(
    //     "INVALID_RESOURCE",
    //     "Resource parameter does not match authorization request",
    //     400
    //   );
    // }

    await this.verifyCodeVerifier(record, request.code_verifier);

    // Generate refresh token
    const refreshToken = await this.storeRefreshToken({
      accessToken: record.accessToken,
      clientId: record.clientId,
      scope: record.scope,
      tokenType: record.tokenType,
      user: record.user,
      resource: record.resource,
    });

    return {
      access_token: record.accessToken,
      token_type: record.tokenType,
      scope: record.scope,
      refresh_token: refreshToken,
      expires_in: Math.floor(this.refreshTokenTtlMs / 1000), // 30 days in seconds (GitHub tokens don't expire but some clients require this field)
      user: {
        id: record.user.id,
        login: record.user.login,
        name: record.user.name,
        avatarUrl: record.user.avatar_url,
        htmlUrl: record.user.html_url,
      },
    };
  }

  public async revokeToken(request: OAuthRevokeRequest): Promise<void> {
    await this.assertClient(request.client_id);

    // Try to revoke as refresh token first (most common case)
    const deleted = await this.databaseService.executeWithRlsClient(
      request.client_id,
      async (tx) => {
        const result = await tx
          .delete(oauthConnections)
          .where(eq(oauthConnections.refreshToken, request.token))
          .returning();

        return result.length > 0;
      }
    );

    // If token_type_hint is access_token or refresh token wasn't found,
    // try to revoke by access token
    if (!deleted && request.token_type_hint !== "refresh_token") {
      await this.databaseService.executeWithRlsClient(
        request.client_id,
        async (tx) => {
          await tx
            .delete(oauthConnections)
            .where(eq(oauthConnections.accessToken, request.token));
        }
      );
    }

    // Per RFC 7009, revocation endpoint should return 200 even if token doesn't exist
    // to prevent token scanning attacks
  }

  private async handleRefreshTokenGrant(
    request: Extract<OAuthTokenRequest, { grant_type: "refresh_token" }>
  ): Promise<OAuthTokenResponse> {
    await this.assertClient(request.client_id);

    const record = await this.consumeRefreshToken(request.refresh_token);

    if (record.clientId !== request.client_id) {
      throw new ServerError(
        "INVALID_OAUTH_CLIENT",
        "Invalid OAuth client identifier",
        400
      );
    }

    // Validate the existing GitHub access token
    await this.assertTokenValidity(record.accessToken);

    // Generate new refresh token
    const newRefreshToken = await this.storeRefreshToken({
      accessToken: record.accessToken,
      clientId: record.clientId,
      scope: request.scope ?? record.scope,
      tokenType: record.tokenType,
      user: record.user,
      resource: record.resource,
    });

    return {
      access_token: record.accessToken,
      token_type: record.tokenType,
      scope: request.scope ?? record.scope,
      refresh_token: newRefreshToken,
      expires_in: Math.floor(this.refreshTokenTtlMs / 1000), // 30 days in seconds (GitHub tokens don't expire but some clients require this field)
      user: {
        id: record.user.id,
        login: record.user.login,
        name: record.user.name,
        avatarUrl: record.user.avatar_url,
        htmlUrl: record.user.html_url,
      },
    };
  }

  private async assertTokenValidity(accessToken: string): Promise<void> {
    const url = `${GITHUB_API_BASE_URL}/applications/${this.clientId}/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (response.status === 404) {
      console.warn("GitHub OAuth token validation rejected", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("GitHub OAuth token validation failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub OAuth validation failed",
        502
      );
    }
  }

  private async fetchUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (response.status === 401) {
      console.warn("GitHub user lookup rejected", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("GitHub user lookup failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub user lookup failed",
        502
      );
    }

    const user = (await response.json()) as GitHubUser;

    return user;
  }

  private getEnvironmentVariable(name: string): string {
    const value = Deno.env.get(name);

    if (value === undefined || value.length === 0) {
      throw new ServerError(
        "INVALID_SERVER_CONFIGURATION",
        `Missing ${name} environment variable`,
        500
      );
    }

    return value;
  }

  private getOptionalEnvironmentVariable(
    name: string,
    defaultValue: string
  ): string {
    const value = Deno.env.get(name);

    if (value === undefined || value.length === 0) {
      return defaultValue;
    }

    return value;
  }

  private normalizeUrl(url: string): string {
    try {
      return new URL(url).toString();
    } catch (error) {
      console.error("Invalid URL provided", { url, error });
      throw new ServerError(
        "INVALID_SERVER_CONFIGURATION",
        "Invalid URL provided",
        500
      );
    }
  }

  private resolveScope(scope: string | undefined): string {
    if (scope === undefined || scope.trim().length === 0) {
      return this.requestedScope;
    }

    const requestedScopes = scope
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (requestedScopes.length === 0) {
      return this.requestedScope;
    }

    const supportedScopes = new Set(OAUTH_SCOPES_SUPPORTED);
    const unsupportedScopes = requestedScopes.filter(
      (requestedScope) => !supportedScopes.has(requestedScope)
    );

    if (unsupportedScopes.length > 0) {
      console.warn("OAuth scope mismatch, falling back to default", {
        provided: requestedScopes,
        unsupported: unsupportedScopes,
        supported: OAUTH_SCOPES_SUPPORTED,
      });
      return this.requestedScope;
    }

    return requestedScopes.join(" ");
  }

  private async assertClient(clientId: string): Promise<void> {
    if (clientId === this.clientId) {
      return;
    }

    if (await this.clientRegistry.isClientRegistered(clientId)) {
      return;
    }

    throw new ServerError(
      "INVALID_OAUTH_CLIENT",
      "Unsupported OAuth client",
      400
    );
  }

  private async assertRedirectUri(
    clientId: string,
    redirectUri: string
  ): Promise<void> {
    const normalized = this.normalizeUrl(redirectUri);

    // For the built-in GitHub client, allow any redirect URI in development
    if (clientId === this.clientId) {
      return;
    }

    // For registered OAuth clients, validate against their registered redirect URIs
    const client = await this.clientRegistry.getClient(clientId);

    if (client === null || !client.redirectUris.includes(normalized)) {
      throw new ServerError(
        "INVALID_OAUTH_REDIRECT_URI",
        "Redirect URI is not allowed",
        400
      );
    }
  }

  private async createSignedState(
    payload: AuthorizationStatePayload
  ): Promise<string> {
    const encodedPayload = Base64Utils.stringToBase64Url(
      JSON.stringify(payload)
    );
    const signature = await this.signState(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  private async parseSignedState(
    state: string
  ): Promise<AuthorizationStatePayload> {
    const [encodedPayload, providedSignature] = state.split(".");

    if (encodedPayload === undefined || providedSignature === undefined) {
      throw new ServerError("INVALID_OAUTH_STATE", "Invalid OAuth state", 400);
    }

    const expectedSignature = await this.signState(encodedPayload);

    if (!this.timingSafeEqual(expectedSignature, providedSignature)) {
      throw new ServerError("INVALID_OAUTH_STATE", "Invalid OAuth state", 400);
    }

    const payloadText = Base64Utils.base64UrlToString(encodedPayload);

    let payload: AuthorizationStatePayload | null = null;

    try {
      payload = JSON.parse(payloadText) as AuthorizationStatePayload;
    } catch (error) {
      console.error("Failed to parse OAuth state payload", {
        payload: payloadText,
        error,
      });
    }

    if (
      payload === null ||
      typeof payload.nonce !== "string" ||
      typeof payload.clientState !== "string" ||
      typeof payload.clientId !== "string" ||
      typeof payload.redirectUri !== "string" ||
      typeof payload.codeChallenge !== "string" ||
      payload.codeChallenge.length === 0 ||
      payload.codeChallengeMethod !== "S256" ||
      typeof payload.scope !== "string" ||
      typeof payload.iat !== "number"
    ) {
      throw new ServerError("INVALID_OAUTH_STATE", "Invalid OAuth state", 400);
    }

    const age = Date.now() - payload.iat;

    if (age > this.stateTtlMs) {
      throw new ServerError("EXPIRED_OAUTH_STATE", "Expired OAuth state", 400);
    }

    return payload;
  }

  private async exchangeGitHubCodeForToken(
    code: string
  ): Promise<GitHubAccessTokenResponse> {
    let response: Response;

    try {
      response = await fetch(GITHUB_OAUTH_ACCESS_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      });
    } catch (error) {
      console.error("GitHub OAuth token exchange request failed", {
        error,
      });

      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub OAuth exchange failed",
        502
      );
    }

    const responseBody = await response.clone().text();

    let payload: GitHubAccessTokenResponse | GitHubAccessTokenError | null =
      null;

    try {
      payload = (await response.json()) as
        | GitHubAccessTokenResponse
        | GitHubAccessTokenError;
    } catch (error) {
      console.error("GitHub OAuth token exchange returned non-JSON payload", {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        error,
      });

      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub OAuth exchange failed",
        502
      );
    }

    if (payload === null) {
      console.error("GitHub OAuth token exchange yielded an empty payload", {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      });

      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub OAuth exchange failed",
        502
      );
    }

    if ("error" in payload) {
      const description =
        payload.error_description ?? "Invalid GitHub authorization code";
      const logPayload = {
        error: payload.error,
        error_description: payload.error_description,
        error_uri: payload.error_uri,
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      };

      if (
        payload.error === "bad_verification_code" ||
        payload.error === "incorrect_client_credentials" ||
        payload.error === "invalid_grant"
      ) {
        console.warn("GitHub OAuth token exchange rejected", logPayload);

        throw new ServerError("INVALID_OAUTH_CODE", description, 400);
      }

      console.error("GitHub OAuth token exchange failed", logPayload);

      throw new ServerError("GITHUB_OAUTH_UNAVAILABLE", description, 502);
    }

    if (!response.ok) {
      console.error("GitHub OAuth token exchange HTTP error", {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      });

      if (response.status === 400 || response.status === 401) {
        throw new ServerError(
          "INVALID_OAUTH_CODE",
          "Invalid GitHub authorization code",
          400
        );
      }

      throw new ServerError(
        "GITHUB_OAUTH_UNAVAILABLE",
        "GitHub OAuth exchange failed",
        502
      );
    }

    return payload as GitHubAccessTokenResponse;
  }

  private async storeAuthorizationCode(
    record: AuthorizationCodeRecordInputType
  ): Promise<string> {
    await this.cleanupExpiredAuthorizationCodes();

    const code = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + this.authorizationCodeTtlMs
    ).toISOString();

    await this.databaseService.executeWithRlsClient(
      record.clientId,
      async (tx) => {
        await tx.insert(oauthAuthorizationCodes).values({
          code,
          clientId: record.clientId,
          redirectUri: record.redirectUri,
          codeChallenge: record.codeChallenge,
          codeChallengeMethod: record.codeChallengeMethod,
          scope: record.scope,
          accessToken: record.accessToken,
          tokenType: record.tokenType,
          user: record.user,
          resource: record.resource,
          expiresAt,
        });
      }
    );

    return code;
  }

  private async consumeAuthorizationCode(
    code: string
  ): Promise<AuthorizationCodeRecord> {
    // First, fetch without RLS to get clientId
    const records = await this.databaseService
      .get()
      .select()
      .from(oauthAuthorizationCodes)
      .where(eq(oauthAuthorizationCodes.code, code));

    if (records.length === 0) {
      console.error("Authorization code not found", {
        code,
      });
      throw new ServerError(
        "INVALID_OAUTH_CODE",
        "Invalid OAuth authorization code",
        400
      );
    }

    const record = records[0];
    const now = new Date();
    const expiresAt = new Date(record.expiresAt);

    if (expiresAt < now) {
      await this.databaseService.executeWithRlsClient(
        record.clientId,
        async (tx) => {
          await tx
            .delete(oauthAuthorizationCodes)
            .where(eq(oauthAuthorizationCodes.code, code));
        }
      );
      throw new ServerError(
        "EXPIRED_OAUTH_CODE",
        "Expired OAuth authorization code",
        400
      );
    }

    // Delete the code after successful validation (single use)
    await this.databaseService.executeWithRlsClient(
      record.clientId,
      async (tx) => {
        await tx
          .delete(oauthAuthorizationCodes)
          .where(eq(oauthAuthorizationCodes.code, code));
      }
    );

    return {
      clientId: record.clientId,
      redirectUri: record.redirectUri,
      codeChallenge: record.codeChallenge,
      codeChallengeMethod: record.codeChallengeMethod as "S256",
      scope: record.scope,
      accessToken: record.accessToken,
      tokenType: record.tokenType,
      user: record.user as GitHubUser,
      expiresAt: expiresAt.getTime(),
      resource: record.resource ?? undefined,
    };
  }

  private async cleanupExpiredAuthorizationCodes(): Promise<void> {
    const now = new Date().toISOString();

    // This cleanup runs without RLS context since it's a maintenance operation
    await this.databaseService
      .get()
      .delete(oauthAuthorizationCodes)
      .where(lt(oauthAuthorizationCodes.expiresAt, now));
  }

  private async verifyCodeVerifier(
    record: AuthorizationCodeRecord,
    codeVerifier: string
  ): Promise<void> {
    if (record.codeChallengeMethod !== "S256") {
      throw new ServerError(
        "INVALID_CODE_CHALLENGE_METHOD",
        "Unsupported code challenge method",
        400
      );
    }

    const expected = await this.deriveCodeChallenge(codeVerifier);

    if (!this.timingSafeEqual(expected, record.codeChallenge)) {
      throw new ServerError(
        "INVALID_CODE_VERIFIER",
        "Invalid OAuth code verifier",
        400
      );
    }
  }

  private async deriveCodeChallenge(codeVerifier: string): Promise<string> {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return Base64Utils.arrayBufferToBase64Url(digest);
  }

  private createErrorRedirect(
    state: AuthorizationStatePayload,
    query: GitHubCallbackQuery
  ): string {
    const redirectUrl = new URL(state.redirectUri);
    redirectUrl.searchParams.set("error", query.error ?? "access_denied");
    redirectUrl.searchParams.set("state", state.clientState);

    if (query.error_description !== undefined) {
      redirectUrl.searchParams.set(
        "error_description",
        query.error_description
      );
    }

    if (query.error_uri !== undefined) {
      redirectUrl.searchParams.set("error_uri", query.error_uri);
    }

    return redirectUrl.toString();
  }

  private async signState(encodedPayload: string): Promise<string> {
    const key = await this.getStateKey();
    const data = new TextEncoder().encode(encodedPayload);
    const signature = await crypto.subtle.sign(this.stateAlgorithm, key, data);

    return Base64Utils.arrayBufferToBase64Url(signature);
  }

  private async getStateKey(): Promise<CryptoKey> {
    if (this.stateKeyPromise !== null) {
      return await this.stateKeyPromise;
    }

    const keyData = new TextEncoder().encode(this.clientSecret);
    this.stateKeyPromise = crypto.subtle.importKey(
      "raw",
      keyData,
      this.stateAlgorithm,
      false,
      ["sign", "verify"]
    );

    return await this.stateKeyPromise;
  }

  private timingSafeEqual(first: string, second: string): boolean {
    if (first.length !== second.length) {
      return false;
    }

    let result = 0;

    for (let index = 0; index < first.length; index += 1) {
      result |= first.charCodeAt(index) ^ second.charCodeAt(index);
    }

    return result === 0;
  }

  private async storeRefreshToken(
    record: RefreshTokenRecordInputType
  ): Promise<string> {
    await this.cleanupExpiredRefreshTokens();

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + this.refreshTokenTtlMs
    ).toISOString();

    await this.databaseService.executeWithRlsClient(
      record.clientId,
      async (tx) => {
        await tx.insert(oauthConnections).values({
          refreshToken,
          accessToken: record.accessToken,
          clientId: record.clientId,
          scope: record.scope,
          tokenType: record.tokenType,
          user: record.user,
          resource: record.resource,
          expiresAt,
        });
      }
    );

    return refreshToken;
  }

  private async consumeRefreshToken(
    refreshToken: string
  ): Promise<RefreshTokenRecord> {
    // First, fetch without RLS to get clientId
    const records = await this.databaseService
      .get()
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.refreshToken, refreshToken));

    if (records.length === 0) {
      console.error("Refresh token not found", {
        refreshToken,
      });
      throw new ServerError(
        "INVALID_REFRESH_TOKEN",
        "Invalid refresh token",
        400
      );
    }

    const record = records[0];
    const now = new Date();
    const expiresAt = new Date(record.expiresAt);

    if (expiresAt < now) {
      await this.databaseService.executeWithRlsClient(
        record.clientId,
        async (tx) => {
          await tx
            .delete(oauthConnections)
            .where(eq(oauthConnections.refreshToken, refreshToken));
        }
      );
      throw new ServerError(
        "EXPIRED_REFRESH_TOKEN",
        "Expired refresh token",
        400
      );
    }

    // Delete the used refresh token (one-time use)
    await this.databaseService.executeWithRlsClient(
      record.clientId,
      async (tx) => {
        await tx
          .delete(oauthConnections)
          .where(eq(oauthConnections.refreshToken, refreshToken));
      }
    );

    return {
      refreshToken: record.refreshToken,
      accessToken: record.accessToken,
      clientId: record.clientId,
      scope: record.scope,
      tokenType: record.tokenType,
      user: record.user as GitHubUser,
      expiresAt: expiresAt.getTime(),
      resource: record.resource ?? undefined,
    };
  }

  private async cleanupExpiredRefreshTokens(): Promise<void> {
    const now = new Date().toISOString();
    // This cleanup runs without RLS context since it's a maintenance operation
    await this.databaseService
      .get()
      .delete(oauthConnections)
      .where(lt(oauthConnections.expiresAt, now));
  }
}

import { createMiddleware } from "hono/factory";
import { inject, injectable } from "@needle-di/core";
import type { Payload } from "@wok/djwt";
import { ServerError } from "../versions/v1/models/server-error.ts";
import { JWTService } from "../../core/services/jwt-service.ts";
import { OAuthAuthorizationService } from "../versions/v1/services/authentication/oauth-authorization-service.ts";
import type { AuthenticationPrincipalType } from "../versions/v1/types/authentication/authentication-principal-type.ts";
import { UrlUtils } from "../../core/utils/url-utils.ts";

@injectable()
export class AuthenticationMiddleware {
  private jwtPayloadCache = new WeakMap<object, Payload>();

  constructor(
    private jwtService = inject(JWTService),
    private oauthAuthorizationService = inject(OAuthAuthorizationService),
  ) {}

  public create() {
    return createMiddleware(async (context, next) => {
      const authorization = context.req.header("Authorization") ?? null;
      const jwt = this.getTokenFromContext(authorization);
      const principal = await this.resolvePrincipal(jwt);

      // Validate token audience for MCP endpoints per RFC 8707
      await this.validateTokenAudience(jwt, context.req.url, principal);

      context.set("userId", principal.id);
      context.set("userHandle", principal.userHandle ?? null);
      context.set("userDisplayName", principal.name);
      context.set("authenticationProvider", principal.provider);

      await next();
    });
  }

  public getTokenFromContext(authorization: string | null): string {
    const token =
      authorization === null
        ? null
        : authorization.replace("Bearer", "").trim();

    if (token === null || token.length === 0) {
      throw new ServerError("NO_TOKEN_PROVIDED", "No token provided", 401);
    }

    return token;
  }

  private async resolvePrincipal(
    token: string
  ): Promise<AuthenticationPrincipalType> {
    // Try JWT first
    if (this.isJwtToken(token)) {
      try {
        return await this.resolveInternalPrincipal(token);
      } catch (error) {
        // JWT verification failed, continue to OAuth
      }
    }

    // Try OAuth access token
    return await this.resolveOAuthPrincipal(token);
  }

  private async resolveInternalPrincipal(
    token: string
  ): Promise<AuthenticationPrincipalType> {
    const payload = await this.jwtService.verify(token);

    // Cache payload to avoid re-verification during audience validation
    const cacheKey = { token };
    this.jwtPayloadCache.set(cacheKey, payload);

    const idValue = payload.id ?? payload.sub ?? null;

    if (idValue === null) {
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    const nameValue = payload.name ?? payload.username ?? payload.login ?? "";
    const rolesValue = Array.isArray(payload.roles) ? payload.roles : [];

    return {
      id: typeof idValue === "string" ? idValue : String(idValue),
      name:
        typeof nameValue === "string" && nameValue.length > 0
          ? nameValue
          : "User",
      roles: rolesValue.filter(
        (role): role is string => typeof role === "string"
      ),
      provider: "internal",
    };
  }

  private async resolveOAuthPrincipal(
    token: string
  ): Promise<AuthenticationPrincipalType> {
    const connection = await this.oauthAuthorizationService.validateAccessToken(token);

    if (!connection) {
      throw new ServerError("INVALID_TOKEN", "Invalid OAuth access token", 401);
    }

    const user = connection.user as { id: string; displayName?: string };

    return {
      id: user.id,
      name: user.displayName || "User",
      roles: [],
      provider: "oauth",
    };
  }

  private async validateTokenAudience(
    token: string,
    requestUrl: string,
    principal: AuthenticationPrincipalType
  ): Promise<void> {
    const url = new URL(requestUrl);
    
    if (principal.provider === "oauth") {
      // For OAuth tokens, validate resource claim per RFC 8707
      await this.oauthAuthorizationService.validateTokenResource(
        token,
        requestUrl,
        url.pathname
      );
    } else if (principal.provider === "internal") {
      // For internal JWTs, always validate the audience claim
      const cacheKey = { token };
      const payload = this.jwtPayloadCache.get(cacheKey);

      if (!payload) {
        // Fallback: verify again if cache miss (shouldn't happen)
        const freshPayload = await this.jwtService.verify(token);
        this.validateJwtAudience(freshPayload, requestUrl, url.pathname);
      } else {
        this.validateJwtAudience(payload, requestUrl, url.pathname);
        // Clean up cache after use
        this.jwtPayloadCache.delete(cacheKey);
      }
    }
  }

  private validateJwtAudience(
    payload: Payload,
    requestUrl: string,
    requestPath: string
  ): void {
    const audience = payload.aud;

    if (!audience) {
      throw new ServerError(
        "INVALID_TOKEN_AUDIENCE",
        "Token does not contain audience claim",
        403
      );
    }

    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
    const requestedResource = new URL(
      requestPath,
      applicationBaseURL
    ).toString();

    const audiences = Array.isArray(audience) ? audience : [audience];

    // Check if any audience matches (exact match or wildcard pattern)
    const hasAccess = audiences.some((aud) => {
      // Exact match
      if (aud === requestedResource) return true;

      // Wildcard match (e.g., "https://example.com/*" matches "https://example.com/api/v1/mcp/global")
      if (aud.endsWith("/*")) {
        const baseAudience = aud.slice(0, -2);
        return requestedResource.startsWith(baseAudience);
      }

      return false;
    });

    if (!hasAccess) {
      throw new ServerError(
        "INVALID_TOKEN_AUDIENCE",
        "Token is not valid for this resource",
        403
      );
    }
  }

  private isJwtToken(token: string): boolean {
    const segments = token.split(".");

    if (segments.length !== 3) {
      return false;
    }

    return segments.every((segment) => segment.length > 0);
  }
}

import { createMiddleware } from "hono/factory";
import { inject, injectable } from "@needle-di/core";
import type { Payload } from "@wok/djwt";
import { ServerError } from "../versions/v1/models/server-error.ts";
import { JWTService } from "../../core/services/jwt-service.ts";
import { GitHubOAuthService } from "../versions/v1/services/authentication/github-oauth-service.ts";
import type { AuthenticationPrincipalType } from "../versions/v1/types/authentication/authentication-principal-type.ts";
import { UrlUtils } from "../../core/utils/url-utils.ts";

@injectable()
export class AuthenticationMiddleware {
  private jwtPayloadCache = new WeakMap<object, Payload>();

  constructor(
    private jwtService = inject(JWTService),
    private gitHubOAuthService = inject(GitHubOAuthService)
  ) {
    this.generateJWT();
  }

  public create() {
    return createMiddleware(async (context, next) => {
      const authorization = context.req.header("Authorization") ?? null;
      const jwt = this.getTokenFromContext(authorization);
      const principal = await this.resolvePrincipal(jwt);

      // Validate token audience for MCP endpoints per RFC 8707
      await this.validateTokenAudience(jwt, context.req.path, principal);

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
    if (this.isJwtToken(token)) {
      try {
        return await this.resolveInternalPrincipal(token);
      } catch (error) {
        if (
          error instanceof ServerError &&
          error.getCode() === "INVALID_TOKEN"
        ) {
          return await this.resolveGitHubPrincipal(token);
        }

        throw error;
      }
    }

    return await this.resolveGitHubPrincipal(token);
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

  private async resolveGitHubPrincipal(
    token: string
  ): Promise<AuthenticationPrincipalType> {
    const user = await this.gitHubOAuthService.getAuthenticatedUser(token);

    return {
      id: String(user.id),
      name: user.name ?? user.login,
      userHandle: user.login,
      avatarUrl: user.avatar_url ?? undefined,
      roles: [],
      provider: "github",
    };
  }

  private async validateTokenAudience(
    token: string,
    requestPath: string,
    principal: AuthenticationPrincipalType
  ): Promise<void> {
    // Only validate audience for MCP endpoints (protected resources)
    if (!requestPath.startsWith("/api/v1/mcp/")) {
      return;
    }

    if (principal.provider === "github") {
      // For GitHub OAuth tokens, validate they were issued for this resource
      await this.gitHubOAuthService.validateTokenResource(token, requestPath);
    } else if (principal.provider === "internal") {
      // For JWTs, validate the audience claim using cached payload
      const cacheKey = { token };
      const payload = this.jwtPayloadCache.get(cacheKey);

      if (!payload) {
        // Fallback: verify again if cache miss (shouldn't happen)
        const freshPayload = await this.jwtService.verify(token);
        this.validateJwtAudience(freshPayload, requestPath);
      } else {
        this.validateJwtAudience(payload, requestPath);
        // Clean up cache after use
        this.jwtPayloadCache.delete(cacheKey);
      }
    }
  }

  private validateJwtAudience(payload: Payload, requestPath: string): void {
    const audience = payload.aud;

    if (!audience) {
      throw new ServerError(
        "INVALID_TOKEN_AUDIENCE",
        "Token does not contain audience claim",
        403
      );
    }

    const applicationBaseURL = UrlUtils.getApplicationBaseURL();
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

  private async generateJWT() {
    const jwt = await this.jwtService.createManagementToken();
    console.log("🔑", jwt);
  }

  private isJwtToken(token: string): boolean {
    const segments = token.split(".");

    if (segments.length !== 3) {
      return false;
    }

    return segments.every((segment) => segment.length > 0);
  }
}

import { inject, injectable } from "@needle-di/core";
import { JWTService } from "../../../core/services/jwt-service.ts";
import { UrlUtils } from "../../../core/utils/url-utils.ts";
import { ServerError } from "../../versions/v1/models/server-error.ts";
import type { AuthenticationStrategyInterface } from "../../../core/interfaces/authentication/authentication-strategy-interface.ts";
import { AuthenticationPrincipalType } from "../../../core/types/authentication/authentication-principal-type.ts";
import { AuthenticationStrategyResultType } from "../../../core/types/authentication/authentication-strategy-result-type.ts";

@injectable()
export class InternalJwtAuthenticationStrategy implements AuthenticationStrategyInterface {
  constructor(private jwtService = inject(JWTService)) {}

  public async authenticate(
    token: string,
  ): Promise<AuthenticationStrategyResultType | null> {
    if (!this.isJwtToken(token)) {
      return null;
    }

    let payload: Record<string, unknown>;

    try {
      payload = await this.jwtService.verify(token);
    } catch (_error) {
      return null;
    }

    const idValue = payload["id"] ?? payload["sub"] ?? null;

    if (idValue === null) {
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    const nameValue =
      payload["name"] ?? payload["username"] ?? payload["login"] ?? "";
    const rolesValue = Array.isArray(payload["roles"]) ? payload["roles"] : [];

    const principal: AuthenticationPrincipalType = {
      id: typeof idValue === "string" ? idValue : String(idValue),
      name:
        typeof nameValue === "string" && nameValue.length > 0
          ? nameValue
          : "User",
      roles: rolesValue.filter(
        (role): role is string => typeof role === "string",
      ),
      provider: "internal",
    };

    return {
      principal,
      jwtPayload: payload,
    };
  }

  public async validateResourceAccess(
    _token: string,
    requestUrl: string,
    strategyResult: AuthenticationStrategyResultType,
  ): Promise<void> {
    const requestPath = new URL(requestUrl).pathname;
    if (!strategyResult.jwtPayload) {
      throw new ServerError(
        "INVALID_TOKEN",
        "Missing token payload for resource validation",
        401,
      );
    }

    const payload = strategyResult.jwtPayload as Record<string, unknown>;

    this.validateJwtAudience(payload, requestUrl, requestPath);

    return Promise.resolve();
  }

  private validateJwtAudience(
    payload: Record<string, unknown>,
    requestUrl: string,
    requestPath: string,
  ): void {
    const audience = payload["aud"];

    if (!audience) {
      throw new ServerError(
        "INVALID_TOKEN_AUDIENCE",
        "Token does not contain audience claim",
        403,
      );
    }

    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
    const requestedResource = new URL(
      requestPath,
      applicationBaseURL,
    ).toString();

    const normalize = (u: string) =>
      u.length > 1 && u.endsWith("/") ? u.slice(0, -1) : u;

    const audiences = Array.isArray(audience) ? audience : [audience];
    const hasAccess = audiences.some((audienceValue) => {
      const audienceStr = String(audienceValue);
      const normalizedRequested = normalize(requestedResource);

      if (audienceStr === "") return false;

      if (!audienceStr.endsWith("/*")) {
        return normalize(audienceStr) === normalizedRequested;
      }

      const baseAudience = audienceStr.slice(0, -2);
      const normalizedBase = normalize(baseAudience);
      return (
        normalizedRequested === normalizedBase ||
        normalizedRequested.startsWith(normalizedBase + "/")
      );
    });

    if (!hasAccess) {
      throw new ServerError(
        "INVALID_TOKEN_AUDIENCE",
        "Token is not valid for this resource",
        403,
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

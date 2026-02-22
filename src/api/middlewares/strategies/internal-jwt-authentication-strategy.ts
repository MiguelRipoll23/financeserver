import { inject, injectable } from "@needle-di/core";
import type { Payload } from "@wok/djwt";
import { JWTService } from "../../../core/services/jwt-service.ts";
import { UrlUtils } from "../../../core/utils/url-utils.ts";
import { ServerError } from "../../versions/v1/models/server-error.ts";
import type { AuthenticationPrincipalType } from "../../versions/v1/types/authentication/authentication-principal-type.ts";
import type { AuthenticationStrategyInterface } from "./interfaces/authentication-strategy-interface.ts";
import type { AuthenticationStrategyResultType } from "./types/authentication-strategy-result-type.ts";

@injectable()
export class InternalJwtAuthenticationStrategy
  implements AuthenticationStrategyInterface
{
  constructor(private jwtService = inject(JWTService)) {}

  public async authenticate(
    token: string
  ): Promise<AuthenticationStrategyResultType | null> {
    if (!this.isJwtToken(token)) {
      return null;
    }

    let payload: Payload;

    try {
      payload = await this.jwtService.verify(token);
    } catch (_error) {
      return null;
    }

    const idValue = payload.id ?? payload.sub ?? null;

    if (idValue === null) {
      throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
    }

    const nameValue = payload.name ?? payload.username ?? payload.login ?? "";
    const rolesValue = Array.isArray(payload.roles) ? payload.roles : [];

    const principal: AuthenticationPrincipalType = {
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

    return {
      principal,
      jwtPayload: payload,
    };
  }

  public async validateResourceAccess(
    token: string,
    requestUrl: string,
    strategyResult: AuthenticationStrategyResultType
  ): Promise<void> {
    const requestPath = new URL(requestUrl).pathname;
    const payload = strategyResult.jwtPayload ?? (await this.jwtService.verify(token));

    this.validateJwtAudience(payload, requestUrl, requestPath);
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
    const requestedResource = new URL(requestPath, applicationBaseURL).toString();

    const audiences = Array.isArray(audience) ? audience : [audience];
    const hasAccess = audiences.some((audienceValue) => {
      if (audienceValue === requestedResource) {
        return true;
      }

      if (audienceValue.endsWith("/*")) {
        const baseAudience = audienceValue.slice(0, -2);
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

import { inject, injectable } from "@needle-di/core";
import { OAuthAuthorizationService } from "../../versions/v1/services/authentication/oauth-authorization-service.ts";
import { UrlUtils } from "../../../core/utils/url-utils.ts";
import { ServerError } from "../../versions/v1/models/server-error.ts";
import type { AuthenticationStrategyInterface } from "../../../core/interfaces/authentication/authentication-strategy-interface.ts";
import { AuthenticationStrategyResultType } from "../../../core/types/authentication/authentication-strategy-result-type.ts";

@injectable()
export class OAuthAuthenticationStrategy implements AuthenticationStrategyInterface {
  constructor(
    private oauthAuthorizationService = inject(OAuthAuthorizationService),
  ) {}

  public async authenticate(
    token: string,
  ): Promise<AuthenticationStrategyResultType | null> {
    const connection =
      await this.oauthAuthorizationService.validateAccessToken(token);

    if (!connection) {
      return null;
    }

    const user = connection.user as { id?: string; displayName?: string };

    if (!user?.id) {
      return null;
    }

    return {
      principal: {
        id: user.id,
        name: user.displayName || "User",
        roles: [],
        provider: "oauth",
      },
      metadata: {
        resource: connection.resource,
      },
    };
  }

  public async validateResourceAccess(
    token: string,
    requestUrl: string,
    strategyResult: AuthenticationStrategyResultType,
  ): Promise<void> {
    const requestPath = new URL(requestUrl).pathname;

    const resource = strategyResult.metadata?.resource as string | undefined;

    if (resource) {
      const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
      const requestedResource = new URL(
        requestPath,
        applicationBaseURL,
      ).toString();

      const normalize = (u: string) =>
        u.length > 1 && u.endsWith("/") ? u.slice(0, -1) : u;

      if (normalize(resource) !== normalize(requestedResource)) {
        throw new ServerError(
          "INVALID_TOKEN_AUDIENCE",
          "Token is not valid for this resource",
          403,
        );
      }

      return;
    }

    await this.oauthAuthorizationService.validateTokenResource(
      token,
      requestUrl,
      requestPath,
    );
  }
}

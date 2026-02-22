import { inject, injectable } from "@needle-di/core";
import { OAuthAuthorizationService } from "../../versions/v1/services/authentication/oauth-authorization-service.ts";
import type { AuthenticationStrategyInterface } from "./interfaces/authentication-strategy-interface.ts";
import type { AuthenticationStrategyResultType } from "./types/authentication-strategy-result-type.ts";

@injectable()
export class OAuthAuthenticationStrategy
  implements AuthenticationStrategyInterface
{
  constructor(
    private oauthAuthorizationService = inject(OAuthAuthorizationService)
  ) {}

  public async authenticate(
    token: string
  ): Promise<AuthenticationStrategyResultType | null> {
    const connection = await this.oauthAuthorizationService.validateAccessToken(token);

    if (!connection) {
      return null;
    }

    const user = connection.user as { id: string; displayName?: string };

    return {
      principal: {
        id: user.id,
        name: user.displayName || "User",
        roles: [],
        provider: "oauth",
      },
    };
  }

  public async validateResourceAccess(
    token: string,
    requestUrl: string,
    _strategyResult: AuthenticationStrategyResultType
  ): Promise<void> {
    const requestPath = new URL(requestUrl).pathname;

    await this.oauthAuthorizationService.validateTokenResource(
      token,
      requestUrl,
      requestPath
    );
  }
}

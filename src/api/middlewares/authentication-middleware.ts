import { createMiddleware } from "hono/factory";
import { inject, injectable } from "@needle-di/core";
import { ServerError } from "../versions/v1/models/server-error.ts";
import { InternalJwtAuthenticationStrategy } from "./strategies/internal-jwt-authentication-strategy.ts";
import { OAuthAuthenticationStrategy } from "./strategies/oauth-authentication-strategy.ts";
import type { AuthenticationStrategyInterface } from "./strategies/interfaces/authentication-strategy-interface.ts";
import type { AuthenticationStrategyResultType } from "./strategies/types/authentication-strategy-result-type.ts";

@injectable()
export class AuthenticationMiddleware {
  private authenticationStrategies: AuthenticationStrategyInterface[];

  constructor(
    private internalJwtAuthenticationStrategy = inject(
      InternalJwtAuthenticationStrategy
    ),
    private oauthAuthenticationStrategy = inject(OAuthAuthenticationStrategy)
  ) {
    this.authenticationStrategies = [
      this.internalJwtAuthenticationStrategy,
      this.oauthAuthenticationStrategy,
    ];
  }

  public create() {
    return createMiddleware(async (context, next) => {
      const authorization = context.req.header("Authorization") ?? null;
      const token = this.getTokenFromContext(authorization);

      const strategyResult = await this.authenticateWithStrategies(token);
      await strategyResult.strategy.validateResourceAccess(
        token,
        context.req.url,
        strategyResult.result
      );

      const principal = strategyResult.result.principal;
      context.set("userId", principal.id);
      context.set("userHandle", principal.userHandle ?? null);
      context.set("userDisplayName", principal.name);
      context.set("authenticationProvider", principal.provider);

      await next();
    });
  }

  public getTokenFromContext(authorization: string | null): string {
    const token =
      authorization === null ? null : authorization.replace("Bearer", "").trim();

    if (token === null || token.length === 0) {
      throw new ServerError("NO_TOKEN_PROVIDED", "No token provided", 401);
    }

    return token;
  }

  private async authenticateWithStrategies(
    token: string
  ): Promise<{
    strategy: AuthenticationStrategyInterface;
    result: AuthenticationStrategyResultType;
  }> {
    for (const strategy of this.authenticationStrategies) {
      const strategyResult = await strategy.authenticate(token);

      if (strategyResult !== null) {
        return {
          strategy,
          result: strategyResult,
        };
      }
    }

    throw new ServerError("INVALID_TOKEN", "Invalid token", 401);
  }
}

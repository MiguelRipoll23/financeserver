import { createMiddleware } from "hono/factory";
import { inject, injectable } from "@needle-di/core";
import type { Context } from "hono";
import { UsersService } from "../versions/v1/services/users/users-service.ts";
import type { UserInterface } from "../versions/v1/interfaces/users/user-interface.ts";
import { ServerError } from "../versions/v1/models/server-error.ts";
import { HonoVariables } from "../../core/types/hono/hono-variables-type.ts";

@injectable()
export class AuthorizationMiddleware {
  constructor(private usersService = inject(UsersService)) {}

  public create() {
    return createMiddleware<{ Variables: HonoVariables }>(
      async (context, next) => {
        const provider = context.get("authenticationProvider");
        this.validateProvider(provider);

        if (provider === "github") {
          await this.handleGitHubAuth(context);
        }

        await next();
      }
    );
  }

  private validateProvider(provider: string | undefined) {
    if (!provider) {
      throw new ServerError(
        "AUTHORIZATION_CONTEXT_MISSING",
        "Authentication context is missing",
        500
      );
    }
  }

  private async handleGitHubAuth(
    context: Context<{ Variables: HonoVariables }>
  ) {
    const userHandle = context.get("userHandle") ?? null;

    if (!userHandle) {
      throw new ServerError(
        "USER_NOT_AUTHORIZED",
        "GitHub login is missing from authentication context",
        403
      );
    }

    const authorized = await this.usersService.getAuthorizedUserByGitHubLogin(
      userHandle
    );

    if (!authorized) {
      throw new ServerError(
        "USER_NOT_AUTHORIZED",
        "GitHub account is not authorized",
        403
      );
    }

    this.setGitHubUserContext(context, authorized);
  }

  private setGitHubUserContext(
    context: Context<{ Variables: HonoVariables }>,
    authorized: UserInterface
  ) {
    context.set("userId", authorized.id);
    context.set("userHandle", authorized.githubHandle);
    context.set(
      "userDisplayName",
      authorized.displayName ?? authorized.githubHandle
    );
  }
}

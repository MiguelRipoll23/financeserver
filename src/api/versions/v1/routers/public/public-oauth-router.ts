import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { GitHubOAuthService } from "../../services/authentication/github-oauth-service.ts";
import { OAuthClientRegistryService } from "../../services/authentication/oauth-client-registry-service.ts";
import {
  GitHubCallbackQuerySchema,
  OAuthAuthorizeQuerySchema,
  OAuthTokenRequestFormSchema,
  OAuthTokenRequestSchema,
  OAuthTokenResponseSchema,
  OAuthClientRegistrationRequestSchema,
  OAuthClientRegistrationResponseSchema,
  OAuthRevokeRequestFormSchema,
} from "../../schemas/authentication-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class PublicOAuthRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private gitHubOAuthService = inject(GitHubOAuthService),
    private oauthClientRegistryService = inject(OAuthClientRegistryService)
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerClientRegistrationRoute();
    this.registerAuthorizeRoute();
    this.registerGitHubCallbackRoute();
    this.registerTokenRoute();
    this.registerRevokeRoute();
  }

  private registerClientRegistrationRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/oauth/register",
        summary: "Register OAuth client",
        description:
          "Performs dynamic client registration for applications using the OAuth broker.",
        tags: ["OAuth"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: OAuthClientRegistrationRequestSchema,
              },
            },
            required: true,
          },
        },
        responses: {
          201: {
            description: "OAuth client registered successfully",
            content: {
              "application/json": {
                schema: OAuthClientRegistrationResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
        },
      }),
      async (context: Context) => {
        const payload = OAuthClientRegistrationRequestSchema.parse(
          await context.req.json()
        );

        const response =
          await this.oauthClientRegistryService.registerPublicClient(payload);

        return context.json(response, 201);
      }
    );
  }

  private registerAuthorizeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/oauth/authorize",
        summary: "Start OAuth authorization",
        description:
          "Validates the authorization request and redirects the user to GitHub for consent.",
        tags: ["OAuth"],
        request: {
          query: OAuthAuthorizeQuerySchema,
        },
        responses: {
          302: { description: "Redirects to provider" },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context) => {
        const query = OAuthAuthorizeQuerySchema.parse(context.req.query());
        const redirectUrl =
          await this.gitHubOAuthService.createAuthorizationRedirect(query, context.req.url);

        return context.redirect(redirectUrl, 302);
      }
    );
  }

  private registerGitHubCallbackRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/oauth/github/callback",
        summary: "Handle authentication callback",
        description:
          "Validates the OAuth state, exchanges the upstream authorization code, and redirects back to the client.",
        tags: ["OAuth"],
        request: {
          query: GitHubCallbackQuerySchema,
        },
        responses: {
          302: { description: "Redirects back to OAuth client" },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context) => {
        const query = GitHubCallbackQuerySchema.parse(context.req.query());
        const redirectUrl =
          await this.gitHubOAuthService.createCallbackRedirect(query, context.req.url);

        return context.redirect(redirectUrl, 302);
      }
    );
  }

  private registerTokenRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/oauth/token",
        summary: "Exchange authorization code",
        description:
          "Exchanges an authorization code + PKCE verifier for an access token.",
        tags: ["OAuth"],
        request: {
          body: {
            content: {
              "application/x-www-form-urlencoded": {
                schema: OAuthTokenRequestFormSchema,
              },
            },
            required: true,
          },
        },
        responses: {
          200: {
            description: "OAuth token issued successfully",
            content: {
              "application/json": {
                schema: OAuthTokenResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context) => {
        const body = await context.req.parseBody();
        const payload = OAuthTokenRequestSchema.parse(body);
        const tokenResponse =
          await this.gitHubOAuthService.exchangeAuthorizationCode(payload);

        return context.json(tokenResponse, 200);
      }
    );
  }

  private registerRevokeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/oauth/revoke",
        summary: "Revoke OAuth token",
        description:
          "Revokes a refresh token or access token, invalidating the OAuth session.",
        tags: ["OAuth"],
        request: {
          body: {
            content: {
              "application/x-www-form-urlencoded": {
                schema: OAuthRevokeRequestFormSchema,
              },
            },
            required: true,
          },
        },
        responses: {
          200: {
            description: "Token revoked successfully",
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context) => {
        const body = await context.req.parseBody();
        const payload = OAuthRevokeRequestFormSchema.parse(body);
        await this.gitHubOAuthService.revokeToken(payload);

        return context.body(null, 200);
      }
    );
  }
}

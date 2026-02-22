import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import { OAuthClientRegistryService } from "../../services/authentication/oauth-client-registry-service.ts";
import { OAuthRequestService } from "../../services/authentication/oauth-request-service.ts";
import { OAuthAuthorizationService } from "../../services/authentication/oauth-authorization-service.ts";
import {
  OAuthAuthorizeQuerySchema,
  OAuthClientRegistrationRequestSchema,
  OAuthClientRegistrationResponseSchema,
  OAuthRequestDetailsSchema,
  OAuthRevokeRequestFormSchema,
  OAuthTokenRequestFormSchema,
  OAuthTokenRequestSchema,
  OAuthTokenResponseSchema,
} from "../../schemas/oauth-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class PublicOAuthRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private oauthAuthorizationService = inject(OAuthAuthorizationService),
    private oauthClientRegistryService = inject(OAuthClientRegistryService),
    private oauthRequestService = inject(OAuthRequestService),
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
    this.registerGetRequestRoute();
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
          await context.req.json(),
        );

        const response = await this.oauthClientRegistryService
          .registerPublicClient(payload);

        return context.json(response, 201);
      },
    );
  }

  private registerAuthorizeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/oauth/authorize",
        summary: "Start OAuth authorization",
        description:
          "Validates the authorization request and redirects the user to the frontend authorization page.",
        tags: ["OAuth"],
        request: {
          query: OAuthAuthorizeQuerySchema,
        },
        responses: {
          302: { description: "Redirects to frontend authorization page" },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context) => {
        const query = OAuthAuthorizeQuerySchema.parse(context.req.query());
        const redirectUrl = await this.oauthRequestService
          .initiateAuthorizationRequest(query);
        return context.redirect(redirectUrl, 302);
      },
    );
  }

  private registerGetRequestRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/oauth/requests/{request_id}",
        summary: "Get OAuth request details",
        description:
          "Retrieves the details of a pending OAuth authorization request for the frontend to display.",
        tags: ["OAuth"],
        request: {
          params: z.object({
            request_id: z.string().min(1).describe("OAuth request identifier"),
          }),
        },
        responses: {
          200: {
            description: "OAuth request details retrieved successfully",
            content: {
              "application/json": {
                schema: OAuthRequestDetailsSchema,
              },
            },
          },
          ...ServerResponse.NotFound,
          ...ServerResponse.BadRequest,
        },
      }),
      async (context: Context) => {
        const { request_id } = context.req.param();
        const request = await this.oauthRequestService.getRequest(request_id);

        return context.json(
          {
            requestId: request.requestId,
            clientId: request.clientId,
            scope: request.scope,
            status: request.status,
            createdAt: request.createdAt,
            expiresAt: request.expiresAt,
          },
          200,
        );
      },
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
        const tokenResponse = await this.oauthAuthorizationService
          .exchangeAuthorizationCode(
            payload,
          );

        return context.json(tokenResponse, 200);
      },
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
        await this.oauthAuthorizationService.revokeToken(payload);

        return context.body(null, 200);
      },
    );
  }
}

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { OAuthAuthorizationServerSchema } from "../schemas/oauth-authorization-server-schema.ts";
import { OAuthProtectedResourceMetadataSchema } from "../schemas/oauth-protected-resource-metadata-schema.ts";
import { OAuthService } from "../services/oauth-service.ts";

@injectable()
export class RootRouter {
  private app: OpenAPIHono;

  constructor(private readonly oauthService = inject(OAuthService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono {
    return this.app;
  }

  private setRoutes(): void {
    this.registerHealthRoute();
    this.registerOAuthAuthorizationServerRoute();
    this.registerOAuthProtectedResourceRoute();
  }

  private registerHealthRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/health",
        summary: "Get health",
        description: "Obtains health status for the finance server",
        tags: ["Default"],
        responses: {
          204: {
            description: "Responds with no content",
          },
        },
      }),
      (c) => {
        return c.body(null, 204);
      },
    );
  }

  private registerOAuthAuthorizationServerRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/.well-known/oauth-authorization-server",
        summary: "Get authorization metadata",
        description:
          "Provides metadata for OAuth 2.0 clients integrating with the finance server",
        tags: ["OAuth"],
        responses: {
          200: {
            description:
              "Responds with OAuth 2.0 authorization server metadata",
            content: {
              "application/json": {
                schema: OAuthAuthorizationServerSchema,
              },
            },
          },
        },
      }),
      (c) => {
        const metadata = this.oauthService.getAuthorizationServerMetadata(
          c.req.url,
        );

        return c.json(metadata, 200);
      },
    );
  }

  private registerOAuthProtectedResourceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/.well-known/oauth-protected-resource",
        summary: "Get protected resource metadata",
        description:
          "Provides protected resource metadata as specified by the OAuth 2.0 Protected Resource Metadata RFC.",
        tags: ["OAuth"],
        responses: {
          200: {
            description: "Responds with protected resource metadata",
            content: {
              "application/json": {
                schema: OAuthProtectedResourceMetadataSchema,
              },
            },
          },
        },
      }),
      (c) => {
        const metadata = this.oauthService.getProtectedResourceMetadata(
          c.req.url,
        );

        return c.json(metadata, 200);
      },
    );
  }
}

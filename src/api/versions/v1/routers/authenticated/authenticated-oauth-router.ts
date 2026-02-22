import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import { OAuthRequestService } from "../../services/authentication/oauth-request-service.ts";
import { OAuthAuthorizationService } from "../../services/authentication/oauth-authorization-service.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { ServerError } from "../../models/server-error.ts";

@injectable()
export class AuthenticatedOAuthRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private oauthAuthorizationService = inject(OAuthAuthorizationService),
    private oauthRequestService = inject(OAuthRequestService),
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerApproveRequestRoute();
    this.registerDenyRequestRoute();
  }

  private registerApproveRequestRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/requests/{request_id}/approve",
        summary: "Approve OAuth request",
        description:
          "Approves the OAuth request and generates an authorization code (requires authentication).",
        tags: ["OAuth"],
        request: {
          params: z.object({
            request_id: z.string().min(1).describe("OAuth request identifier"),
          }),
        },
        responses: {
          200: {
            description: "Authorization code generated successfully",
            content: {
              "application/json": {
                schema: z.object({
                  redirectUrl: z
                    .string()
                    .url()
                    .describe("URL to redirect the user to"),
                }),
              },
            },
          },
          ...ServerResponse.NotFound,
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.Conflict,
        },
      }),
      async (context: Context) => {
        const { request_id } = context.req.param();

        // Validate user context first
        const id = context.get("userId");
        const displayName = context.get("userDisplayName");

        if (!id) {
          throw new ServerError(
            "UNAUTHORIZED",
            "Authentication required to approve OAuth request",
            401,
          );
        }

        const principal = {
          id,
          displayName,
        };

        // Approve the request
        const request = await this.oauthRequestService.approveRequest(
          request_id,
        );

        // Create authorization code and handle potential failure
        try {
          const redirectUrl = await this.oauthAuthorizationService
            .createAuthorizationCode(
              request,
              principal,
            );

          return context.json({ redirectUrl }, 200);
        } catch (error) {
          // If authorization code creation fails, reject the approval to avoid inconsistent state
          try {
            await this.oauthRequestService.denyRequest(request_id);
          } catch (rollbackError) {
            // Rollback failed — don't suppress original error
            console.error(
              "Failed to rollback OAuth request approval for request:",
              request_id,
              "rollback error:",
              rollbackError,
            );
          }
          throw error;
        }
      },
    );
  }

  private registerDenyRequestRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/requests/{request_id}/deny",
        summary: "Deny OAuth request",
        description:
          "Denies the OAuth request and redirects back to the client with an error.",
        tags: ["OAuth"],
        request: {
          params: z.object({
            request_id: z.string().min(1).describe("OAuth request identifier"),
          }),
        },
        responses: {
          200: {
            description: "Request denied successfully",
            content: {
              "application/json": {
                schema: z.object({
                  redirectUrl: z
                    .string()
                    .url()
                    .describe("URL to redirect the user to"),
                }),
              },
            },
          },
          ...ServerResponse.NotFound,
          ...ServerResponse.BadRequest,
          ...ServerResponse.Conflict,
        },
      }),
      async (context: Context) => {
        const { request_id } = context.req.param();
        const request = await this.oauthRequestService.denyRequest(request_id);

        const redirectUrl = new URL(request.redirectUri);
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set(
          "error_description",
          "User denied authorization",
        );
        redirectUrl.searchParams.set("state", request.state);

        return context.json({ redirectUrl: redirectUrl.toString() }, 200);
      },
    );
  }
}

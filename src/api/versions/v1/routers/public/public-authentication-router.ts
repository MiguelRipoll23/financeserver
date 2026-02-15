import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { PasskeyAuthenticationService } from "../../services/passkeys/authentication-service.ts";
import {
  GetAuthenticationOptionsRequestSchema,
  GetAuthenticationOptionsResponseSchema,
  VerifyAuthenticationRequestSchema,
  VerifyAuthenticationResponseSchema,
} from "../../schemas/authentication-schemas.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { ServerError } from "../../models/server-error.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class PublicAuthenticationRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private authenticationService = inject(PasskeyAuthenticationService),
  ) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerGetAuthenticationOptionsRoute();
    this.registerVerifyAuthenticationRoute();
  }

  private registerGetAuthenticationOptionsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/options",
        summary: "Get authentication options",
        description: "Authentication options for a new credential",
        tags: ["Passkey authentication"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetAuthenticationOptionsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Responds with data",
            content: {
              "application/json": {
                schema: GetAuthenticationOptionsResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Forbidden,
        },
      }),
      async (c) => {
        const validated = c.req.valid("json");
        const { transactionId } = validated;
        const origin = c.req.header("Origin");

        if (!origin) {
          throw new ServerError(
            "MISSING_ORIGIN",
            "Origin header is required",
            400,
          );
        }

        const response = await this.authenticationService.getLoginOptions(
          origin,
          transactionId,
        );

        return c.json(response, 200);
      },
    );
  }

  private registerVerifyAuthenticationRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/response",
        summary: "Verify authentication response",
        description:
          "Result of an authentication attempt for an existing credential",
        tags: ["Passkey authentication"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: VerifyAuthenticationRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Responds with data",
            content: {
              "application/json": {
                schema: VerifyAuthenticationResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Forbidden,
        },
      }),
      async (c) => {
        const validated = c.req.valid("json");
        const { transactionId, authenticationResponse } = validated;
        const origin = c.req.header("Origin");

        if (!origin) {
          throw new ServerError(
            "MISSING_ORIGIN",
            "Origin header is required",
            400,
          );
        }

        const requestUrl = c.req.url;
        const response = await this.authenticationService.verifyLogin(
          origin,
          requestUrl,
          transactionId,
          authenticationResponse,
        );

        return c.json(response, 200);
      },
    );
  }
}

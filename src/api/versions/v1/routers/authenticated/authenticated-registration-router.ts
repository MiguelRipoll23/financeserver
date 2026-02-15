import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { PasskeyRegistrationService } from "../../services/passkeys/registration-service.ts";
import {
  GetRegistrationOptionsRequestSchema,
  GetRegistrationOptionsResponseSchema,
  VerifyRegistrationRequestSchema,
  VerifyRegistrationResponseSchema,
} from "../../schemas/registration-schemas.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { ServerError } from "../../models/server-error.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class AuthenticatedRegistrationRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private registrationService = inject(PasskeyRegistrationService),
  ) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerGetRegistrationOptionsRoute();
    this.registerVerifyRegistrationRoute();
  }

  private registerGetRegistrationOptionsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/registration/options",
        summary: "Get registration options",
        description: "Registration options for a new credential",
        tags: ["Passkey authentication"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetRegistrationOptionsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Responds with data",
            content: {
              "application/json": {
                schema: GetRegistrationOptionsResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Forbidden,
        },
      }),
      async (c) => {
        const validated = c.req.valid("json");
        const { transactionId, displayName } = validated;
        const origin = c.req.header("Origin");

        if (!origin) {
          throw new ServerError(
            "MISSING_ORIGIN",
            "Origin header is required",
            400,
          );
        }

        const requestUrl = c.req.url;
        const response = await this.registrationService.getRegistrationOptions(
          origin,
          requestUrl,
          transactionId,
          displayName,
        );

        return c.json(response, 200);
      },
    );
  }

  private registerVerifyRegistrationRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/registration/response",
        summary: "Verify registration response",
        description: "Result of a registration attempt for a new credential",
        tags: ["Passkey authentication"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: VerifyRegistrationRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Responds with data",
            content: {
              "application/json": {
                schema: VerifyRegistrationResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Forbidden,
        },
      }),
      async (c) => {
        const validated = c.req.valid("json");
        const { transactionId, registrationResponse } = validated;
        const origin = c.req.header("Origin");

        if (!origin) {
          throw new ServerError(
            "MISSING_ORIGIN",
            "Origin header is required",
            400,
          );
        }

        const requestUrl = c.req.url;
        const response = await this.registrationService.verifyRegistration(
          origin,
          requestUrl,
          transactionId,
          registrationResponse,
        );

        return c.json(response, 200);
      },
    );
  }
}

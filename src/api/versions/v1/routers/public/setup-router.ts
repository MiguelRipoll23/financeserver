import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { PasskeySetupService } from "../../services/passkeys/setup-service.ts";
import { SetupResponseSchema } from "../../schemas/setup-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class SetupRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private setupService = inject(PasskeySetupService)) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Get setup token",
        description:
          "Returns a setup token if no passkeys are registered, allowing registration of the first passkey",
        tags: ["Passkey authentication"],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: SetupResponseSchema,
              },
            },
            description: "Setup token for first passkey registration",
          },
          204: {
            description: "Passkeys already registered",
          },
        },
      }),
      async (c) => {
        const response = await this.setupService.checkSetup(c.req.url);

        if (response === null) {
          return c.body(null, 204);
        }

        return c.json(response, 200);
      },
    );
  }
}

import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { OTelService } from "../../services/otel-service.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { PushMetricsResponseSchema } from "../../schemas/otel-schemas.ts";

@injectable()
export class AuthenticatedOTelRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private otelService = inject(OTelService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerPushMetricsRoute();
  }

  private registerPushMetricsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/push",
        summary: "Push metrics",
        description:
          "Collects and pushes metrics to the configured exported endpoint.",
        tags: ["OTel"],
        responses: {
          202: {
            description: "Metrics collection accepted",
            content: {
              "application/json": {
                schema: PushMetricsResponseSchema,
              },
            },
          },
        },
      }),
      (context) => {
        this.otelService.pushAllMetrics().catch((error: Error) => {
          console.error("Background metrics collection failed:", error);
        });

        return context.json(
          {
            success: true,
            message: "Metrics collection accepted",
          },
          202,
        );
      },
    );
  }
}

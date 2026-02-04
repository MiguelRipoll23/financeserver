import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Context } from "hono";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { NetWorthCalculationService } from "../../services/net-worth-calculation/net-worth-calculation-service.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedAsyncRequestsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private netWorthCalculationService = inject(NetWorthCalculationService)
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerCalculateNetWorthRoute();
  }

  private registerCalculateNetWorthRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/calculate-net-worth",
        summary: "Calculate net worth",
        description:
          "Calculate net worth by triggering after-tax value calculations for all bank accounts with interest rates, roboadvisors, and crypto exchanges. This is an asynchronous operation that returns immediately.",
        tags: ["Async Requests"],
        responses: {
          202: {
            description: "Calculation request accepted",
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        // Trigger calculation asynchronously (fire and forget)
        this.netWorthCalculationService.calculateAll().catch((error) => {
          console.error("Error calculating net worth:", error);
        });

        return context.body(null, 202);
      }
    );
  }
}

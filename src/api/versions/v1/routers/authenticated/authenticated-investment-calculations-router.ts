import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Context } from "hono";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { InvestmentCalculationsService } from "../../services/investment-calculations/investment-calculations-service.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedInvestmentCalculationsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private investmentCalculationsService = inject(
      InvestmentCalculationsService
    )
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
        tags: ["Investment Calculations"],
        responses: {
          202: {
            description: "Calculation request accepted",
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        // Trigger calculation asynchronously (fire and forget)
        this.investmentCalculationsService.calculateAll().catch((error) => {
          console.error("Error calculating net worth:", error);
        });

        return context.body(null, 202);
      }
    );
  }
}

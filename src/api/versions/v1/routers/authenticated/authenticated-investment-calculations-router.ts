import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Context } from "hono";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { InvestmentCalculationsService } from "../../services/investment-calculations/investment-calculations-service.ts";
import {
  CalculationRequestSchema,
  CalculationResponseSchema,
} from "../../schemas/investment-calculations-schemas.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

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
    this.registerCalculateRoute();
  }

  private registerCalculateRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/calculate",
        summary: "Calculate investment value after tax",
        description:
          "Calculate after-tax values for investments (interest rates, roboadvisors, crypto). Supports three calculation types: interest_rate (requires bankAccountId, currentBalance, currencyCode), roboadvisor (requires roboadvisorId), and crypto (requires cryptoExchangeId, symbolCode).",
        tags: ["Investment Calculations"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CalculationRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Calculation completed successfully",
            content: {
              "application/json": {
                schema: CalculationResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await readJsonOrEmpty(context);
        const body = CalculationRequestSchema.parse(payload);

        const result =
          await this.investmentCalculationsService.calculate(body);

        return context.json(result, 200);
      }
    );
  }
}

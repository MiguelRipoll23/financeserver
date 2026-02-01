import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Context } from "hono";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { BankAccountInterestRatesService } from "../../services/bank-account-interest-rates/bank-account-interest-rates-service.ts";
import {
  CreateBankAccountInterestRateRequestSchema,
  CreateBankAccountInterestRateResponseSchema,
  GetBankAccountInterestRatesRequestSchema,
  GetBankAccountInterestRatesResponseSchema,
  BankAccountInterestRateIdParamSchema,
  UpdateBankAccountInterestRateRequestSchema,
  UpdateBankAccountInterestRateResponseSchema,
} from "../../schemas/bank-account-interest-rates-schemas.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedBankAccountInterestRatesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService,
    ),
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBankAccountInterestRatesRoute();
    this.registerCreateBankAccountInterestRateRoute();
    this.registerUpdateBankAccountInterestRateRoute();
    this.registerDeleteBankAccountInterestRateRoute();
  }

  private registerListBankAccountInterestRatesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List bank account interest rates",
        description: "List bank account interest rates",
        tags: ["Bank account interest rates"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetBankAccountInterestRatesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank account interest rates retrieved successfully",
            content: {
              "application/json": {
                schema: GetBankAccountInterestRatesResponseSchema,
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
        const body = GetBankAccountInterestRatesRequestSchema.parse(payload);

        const result =
          await this.bankAccountInterestRatesService.getBankAccountInterestRates(
            {
              bankAccountId: body.bankAccountId,
              limit: body.limit,
              cursor: body.cursor,
              sortOrder: body.sortOrder,
          });
        return context.json(result, 200);
      }
    );
  }

  private registerCreateBankAccountInterestRateRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create bank account interest rate",
        description: "Create a new bank account interest rate",
        tags: ["Bank account interest rates"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountInterestRateRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank account interest rate created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountInterestRateResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountInterestRateRequestSchema.parse(
          await context.req.json(),
        );
        const result =
          await this.bankAccountInterestRatesService.createBankAccountInterestRate(
            body,
          );
        return context.json(result, 200);
      },
    );
  }

  private registerUpdateBankAccountInterestRateRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update bank account interest rate",
        description: "Update a bank account interest rate",
        tags: ["Bank account interest rates"],
        request: {
          params: BankAccountInterestRateIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountInterestRateRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank account interest rate updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountInterestRateResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BankAccountInterestRateIdParamSchema.parse(
          context.req.param(),
        );
        const body = UpdateBankAccountInterestRateRequestSchema.parse(
          await context.req.json(),
        );
        const result =
          await this.bankAccountInterestRatesService.updateBankAccountInterestRate(
            params.id,
            body,
          );
        return context.json(result, 200);
      },
    );
  }

  private registerDeleteBankAccountInterestRateRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete bank account interest rate",
        description: "Delete a bank account interest rate",
        tags: ["Bank account interest rates"],
        request: {
          params: BankAccountInterestRateIdParamSchema,
        },
        responses: {
          204: {
            description: "Bank account interest rate deleted successfully",
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BankAccountInterestRateIdParamSchema.parse(
          context.req.param(),
        );
        await this.bankAccountInterestRatesService.deleteBankAccountInterestRate(
          params.id,
        );
        return context.body(null, 204);
      },
    );
  }

}

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

@injectable()
export class AuthenticatedBankAccountInterestRatesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService
    )
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerCreateBankAccountInterestRateRoute();
    this.registerGetBankAccountInterestRatesRoute();
    this.registerUpdateBankAccountInterestRateRoute();
    this.registerDeleteBankAccountInterestRateRoute();
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
      async (c: Context<{ Variables: HonoVariables }>) => {
        const body = await c.req.json();
        const result =
          await this.bankAccountInterestRatesService.createBankAccountInterestRate(
            body
          );
        return c.json(result);
      }
    );
  }

  private registerGetBankAccountInterestRatesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/",
        summary: "Get bank account interest rates",
        description: "Get bank account interest rates",
        tags: ["Bank account interest rates"],
        request: {
          query: GetBankAccountInterestRatesRequestSchema,
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
      async (c: Context<{ Variables: HonoVariables }>) => {
        const query = c.req.valid("query");
        const result =
          await this.bankAccountInterestRatesService.getBankAccountInterestRates({
            bankAccountId: query.bankAccountId,
            limit: query.limit ? parseInt(query.limit) : undefined,
            cursor: query.cursor,
            sortOrder: query.sortOrder,
          });
        return c.json(result);
      }
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
      async (c: Context<{ Variables: HonoVariables }>) => {
        const id = parseInt(c.req.param("id"));
        const body = await c.req.json();
        const result =
          await this.bankAccountInterestRatesService.updateBankAccountInterestRate(
            id,
            body
          );
        return c.json(result);
      }
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
      async (c: Context<{ Variables: HonoVariables }>) => {
        const id = parseInt(c.req.param("id"));
        await this.bankAccountInterestRatesService.deleteBankAccountInterestRate(
          id
        );
        return c.body(null, 204);
      }
    );
  }
}
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
        const body = CreateBankAccountInterestRateRequestSchema.parse(
          await c.req.json()
        );
        const result =
          await this.bankAccountInterestRatesService.createBankAccountInterestRate(
            body
          );
        return c.json(result, 200);
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
        const query = c.req.query();
        // Since getBankAccountInterestRates takes specific params, we map them manually or parse if we had a query schema parser helper.
        // The service expects { bankAccountId, limit, cursor, sortOrder }.
        // Previous implementation used c.req.valid('query').
        // To avoid magic strings but stick to Schema.parse, we would need to parse the query object.
        // However, Zod schemas for query params often require preprocessing because query params are strings.
        // Given the prompt "I want to use schema.parse", I will use the schema to parse the query object.
        // NOTE: Hono's c.req.query() returns Record<string, string>.
        // We might need to ensure the schema handles coercion (z.coerce) which GetBankAccountInterestRatesRequestSchema likely extends from PaginationQuerySchema which does.
        
        // However, simpler here to just match the other files. 
        // Let's check how other files handle GETs. 
        // e.g., AuthenticatedBankAccountsRouter uses GetBankAccountsRequestSchema.parse(payload) where payload is from body for POST /find.
        // This is a GET route.
        // I'll stick to manual extraction or reuse the validation logic if available, but to strictly follow "schema.parse":
        
        // Wait, GetBankAccountInterestRatesRequestSchema is a Zod schema.
        const parsedQuery = GetBankAccountInterestRatesRequestSchema.parse(c.req.query());
        
        const result =
          await this.bankAccountInterestRatesService.getBankAccountInterestRates({
            bankAccountId: parsedQuery.bankAccountId,
            limit: parsedQuery.limit,
            cursor: parsedQuery.cursor,
            sortOrder: parsedQuery.sortOrder,
          });
        return c.json(result, 200);
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
        const params = BankAccountInterestRateIdParamSchema.parse(c.req.param());
        const body = UpdateBankAccountInterestRateRequestSchema.parse(
          await c.req.json()
        );
        const result =
          await this.bankAccountInterestRatesService.updateBankAccountInterestRate(
            parseInt(params.id),
            body
          );
        return c.json(result, 200);
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
        const params = BankAccountInterestRateIdParamSchema.parse(c.req.param());
        await this.bankAccountInterestRatesService.deleteBankAccountInterestRate(
          parseInt(params.id)
        );
        return c.body(null, 204);
      }
    );
  }
}

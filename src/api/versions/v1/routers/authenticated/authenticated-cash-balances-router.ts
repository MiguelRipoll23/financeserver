import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { CashService } from "../../services/cash/cash-service.ts";
import {
  CreateCashBalanceRequestSchema,
  CreateCashBalanceResponseSchema,
  GetCashBalancesRequestSchema,
  GetCashBalancesResponseSchema,
  UpdateCashBalanceRequestSchema,
  UpdateCashBalanceResponseSchema,
  CashBalanceIdParamSchema,
} from "../../schemas/cash-balances-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedCashBalancesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private cashService = inject(CashService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListCashBalancesRoute();
    this.registerCreateCashBalanceRoute();
    this.registerUpdateCashBalanceRoute();
    this.registerDeleteCashBalanceRoute();
  }

  private registerCreateCashBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create cash balance",
        description:
          "Records a new balance entry for a cash source. Creates a historical record of the cash balance.",
        tags: ["Cash balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateCashBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Balance created successfully",
            content: {
              "application/json": {
                schema: CreateCashBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateCashBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.cashService.createCashBalance(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListCashBalancesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List cash balances",
        description:
          "Returns paginated balance history for a specific cash source with optional filters.",
        tags: ["Cash balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetCashBalancesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Cash balances page",
            content: {
              "application/json": {
                schema: GetCashBalancesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetCashBalancesRequestSchema.parse(payload);
        const result = await this.cashService.getCashBalances(body);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateCashBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update cash balance",
        description: "Updates an existing cash balance record by identifier.",
        tags: ["Cash balances"],
        request: {
          params: CashBalanceIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateCashBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Balance updated successfully",
            content: {
              "application/json": {
                schema: UpdateCashBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CashBalanceIdParamSchema.parse(context.req.param());
        const body = UpdateCashBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.cashService.updateCashBalance(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteCashBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete cash balance",
        description: "Permanently deletes a cash balance record.",
        tags: ["Cash balances"],
        request: {
          params: CashBalanceIdParamSchema,
        },
        responses: {
          204: {
            description: "Balance deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CashBalanceIdParamSchema.parse(context.req.param());
        await this.cashService.deleteCashBalance(parseInt(id, 10));

        return context.body(null, 204);
      }
    );
  }

  private async readJsonOrEmpty(
    context: Context<{ Variables: HonoVariables }>
  ): Promise<unknown> {
    try {
      return await context.req.json();
    } catch {
      return {};
    }
  }
}

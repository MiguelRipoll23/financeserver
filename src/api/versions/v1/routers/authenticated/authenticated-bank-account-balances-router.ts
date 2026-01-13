import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountsService } from "../../services/bank-accounts/bank-accounts-service.ts";
import {
  CreateBankAccountBalanceRequestSchema,
  CreateBankAccountBalanceResponseSchema,
  GetBankAccountBalancesRequestSchema,
  GetBankAccountBalancesResponseSchema,
  UpdateBankAccountBalanceRequestSchema,
  UpdateBankAccountBalanceResponseSchema,
  BankAccountBalanceIdParamSchema,
} from "../../schemas/bank-account-balances-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedBankAccountBalancesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private bankAccountsService = inject(BankAccountsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBankAccountBalancesRoute();
    this.registerCreateBankAccountBalanceRoute();
    this.registerUpdateBankAccountBalanceRoute();
    this.registerDeleteBankAccountBalanceRoute();
  }

  private registerCreateBankAccountBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create bank account balance",
        description:
          "Records a new balance entry for a bank account. Creates a historical record of the account balance.",
        tags: ["Bank account balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Balance created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result =
          await this.bankAccountsService.createBankAccountBalance(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListBankAccountBalancesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List bank account balances",
        description:
          "Returns paginated balance history for a specific bank account with optional filters.",
        tags: ["Bank account balances"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetBankAccountBalancesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank account balances page",
            content: {
              "application/json": {
                schema: GetBankAccountBalancesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetBankAccountBalancesRequestSchema.parse(payload);
        const result =
          await this.bankAccountsService.getBankAccountBalances(body);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateBankAccountBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{balanceId}",
        summary: "Update bank account balance",
        description:
          "Updates an existing bank account balance record by identifier.",
        tags: ["Bank account balances"],
        request: {
          params: BankAccountBalanceIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Balance updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { accountId, balanceId } = BankAccountBalanceIdParamSchema.parse(
          context.req.param()
        );
        const body = UpdateBankAccountBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.bankAccountsService.updateBankAccountBalance(
          parseInt(accountId, 10),
          parseInt(balanceId, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteBankAccountBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{balanceId}",
        summary: "Delete bank account balance",
        description: "Permanently deletes a bank account balance record.",
        tags: ["Bank account balances"],
        request: {
          params: BankAccountBalanceIdParamSchema,
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
        const { accountId, balanceId } = BankAccountBalanceIdParamSchema.parse(
          context.req.param()
        );
        await this.bankAccountsService.deleteBankAccountBalance(
          parseInt(accountId, 10),
          parseInt(balanceId, 10)
        );

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

import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountsService } from "../../services/bank-accounts/bank-accounts-service.ts";
import {
  BankAccountIdParamSchema,
  CreateBankAccountRequestSchema,
  CreateBankAccountResponseSchema,
  GetBankAccountsRequestSchema,
  GetBankAccountsResponseSchema,
  UpdateBankAccountRequestSchema,
  UpdateBankAccountResponseSchema,
} from "../../schemas/bank-accounts-schemas.ts";
import type { BankAccountsFilter } from "../../interfaces/bank-accounts/bank-accounts-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedBankAccountsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private bankAccountsService = inject(BankAccountsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBankAccountsRoute();
    this.registerCreateBankAccountRoute();
    this.registerUpdateBankAccountRoute();
    this.registerDeleteBankAccountRoute();
  }

  private registerCreateBankAccountRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create bank account",
        description: "Creates a new bank account for the authenticated user.",
        tags: ["Bank accounts"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Bank account created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.bankAccountsService.createBankAccount(body);

        return context.json(result, 201);
      },
    );
  }

  private registerListBankAccountsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List bank accounts",
        description:
          "Returns paginated bank accounts with optional filters supplied via JSON body.",
        tags: ["Bank accounts"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetBankAccountsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank accounts page",
            content: {
              "application/json": {
                schema: GetBankAccountsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await readJsonOrEmpty(context);
        const body = GetBankAccountsRequestSchema.parse(payload);
        const filter: BankAccountsFilter = {
          pageSize: body.limit,
          cursor: body.cursor,
          sortField: body.sortField,
          sortOrder: body.sortOrder,
          name: body.name,
          type: body.type,
        };
        const result = await this.bankAccountsService.getBankAccounts(filter);

        return context.json(result, 200);
      },
    );
  }

  private registerUpdateBankAccountRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update bank account",
        description: "Updates a bank account's details by identifier.",
        tags: ["Bank accounts"],
        request: {
          params: BankAccountIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bank account updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountIdParamSchema.parse(context.req.param());
        const body = UpdateBankAccountRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.bankAccountsService.updateBankAccount(
          parseInt(id, 10),
          body,
        );

        return context.json(result, 200);
      },
    );
  }

  private registerDeleteBankAccountRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete bank account",
        description: "Permanently deletes a bank account and all its balances.",
        tags: ["Bank accounts"],
        request: {
          params: BankAccountIdParamSchema,
        },
        responses: {
          204: {
            description: "Bank account deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountIdParamSchema.parse(context.req.param());
        await this.bankAccountsService.deleteBankAccount(parseInt(id, 10));

        return context.body(null, 204);
      },
    );
  }
}

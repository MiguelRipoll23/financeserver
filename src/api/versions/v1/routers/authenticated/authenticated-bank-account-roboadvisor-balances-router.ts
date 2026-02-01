import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountRoboadvisorsService } from "../../services/bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import {
  CreateBankAccountRoboadvisorBalanceRequestSchema,
  CreateBankAccountRoboadvisorBalanceResponseSchema,
  GetBankAccountRoboadvisorBalancesRequestSchema,
  GetBankAccountRoboadvisorBalancesResponseSchema,
  UpdateBankAccountRoboadvisorBalanceRequestSchema,
  UpdateBankAccountRoboadvisorBalanceResponseSchema,
  BankAccountRoboadvisorBalanceIdParamSchema,
} from "../../schemas/bank-account-roboadvisor-balances-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedBankAccountRoboadvisorBalancesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private roboadvisorsService = inject(BankAccountRoboadvisorsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListRoboadvisorBalancesRoute();
    this.registerCreateRoboadvisorBalanceRoute();
    this.registerUpdateRoboadvisorBalanceRoute();
    this.registerDeleteRoboadvisorBalanceRoute();
  }

  private registerCreateRoboadvisorBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create roboadvisor balance entry",
        description:
          "Records a deposit, withdrawal, or adjustment for a roboadvisor. Tracks cash movements over time.",
        tags: ["Bank account roboadvisor balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Balance entry created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountRoboadvisorBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.roboadvisorsService.createBankAccountRoboadvisorBalance(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListRoboadvisorBalancesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List roboadvisor balance entries",
        description:
          "Returns paginated balance history for roboadvisors with optional filtering.",
        tags: ["Bank account roboadvisor balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorBalancesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Roboadvisor balance entries page",
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorBalancesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await readJsonOrEmpty(context);
        const body = GetBankAccountRoboadvisorBalancesRequestSchema.parse(payload);
        const result = await this.roboadvisorsService.getBankAccountRoboadvisorBalances(body);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateRoboadvisorBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update roboadvisor balance entry",
        description: "Updates an existing balance entry for a roboadvisor.",
        tags: ["Bank account roboadvisor balances"],
        request: {
          params: BankAccountRoboadvisorBalanceIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Balance entry updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorBalanceIdParamSchema.parse(context.req.param());
        const body = UpdateBankAccountRoboadvisorBalanceRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.roboadvisorsService.updateBankAccountRoboadvisorBalance(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteRoboadvisorBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete roboadvisor balance entry",
        description: "Permanently deletes a balance entry from a roboadvisor.",
        tags: ["Bank account roboadvisor balances"],
        request: {
          params: BankAccountRoboadvisorBalanceIdParamSchema,
        },
        responses: {
          204: {
            description: "Balance entry deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorBalanceIdParamSchema.parse(context.req.param());
        await this.roboadvisorsService.deleteBankAccountRoboadvisorBalance(parseInt(id, 10));

        return context.body(null, 204);
      }
    );
  }

}

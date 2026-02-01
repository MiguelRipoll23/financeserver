import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountRoboadvisorsService } from "../../services/bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import {
  CreateBankAccountRoboadvisorFundRequestSchema,
  CreateBankAccountRoboadvisorFundResponseSchema,
  GetBankAccountRoboadvisorFundsRequestSchema,
  GetBankAccountRoboadvisorFundsResponseSchema,
  UpdateBankAccountRoboadvisorFundRequestSchema,
  UpdateBankAccountRoboadvisorFundResponseSchema,
  BankAccountRoboadvisorFundIdParamSchema,
} from "../../schemas/bank-account-roboadvisor-funds-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedBankAccountRoboadvisorFundsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private roboadvisorsService = inject(BankAccountRoboadvisorsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListRoboadvisorFundsRoute();
    this.registerCreateRoboadvisorFundRoute();
    this.registerUpdateRoboadvisorFundRoute();
    this.registerDeleteRoboadvisorFundRoute();
  }

  private registerCreateRoboadvisorFundRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create roboadvisor fund allocation",
        description:
          "Adds a fund allocation to a roboadvisor portfolio. Defines which ETFs or mutual funds the portfolio invests in.",
        tags: ["Bank account roboadvisor funds"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorFundRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Fund allocation created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorFundResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountRoboadvisorFundRequestSchema.parse(await context.req.json());
        const result = await this.roboadvisorsService.createBankAccountRoboadvisorFund(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListRoboadvisorFundsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List roboadvisor fund allocations",
        description: "Returns paginated list of fund allocations with optional filtering by roboadvisor ID, name, ISIN, asset class, region, or currency.",
        tags: ["Bank account roboadvisor funds"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorFundsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "List of fund allocations",
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorFundsResponseSchema,
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
        const body = GetBankAccountRoboadvisorFundsRequestSchema.parse(payload);
        const result = await this.roboadvisorsService.getBankAccountRoboadvisorFunds(body);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateRoboadvisorFundRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update roboadvisor fund allocation",
        description: "Updates an existing fund allocation in a roboadvisor portfolio.",
        tags: ["Bank account roboadvisor funds"],
        request: {
          params: BankAccountRoboadvisorFundIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorFundRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Fund allocation updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorFundResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorFundIdParamSchema.parse(context.req.param());
        const body = UpdateBankAccountRoboadvisorFundRequestSchema.parse(await context.req.json());
        const result = await this.roboadvisorsService.updateBankAccountRoboadvisorFund(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteRoboadvisorFundRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete roboadvisor fund allocation",
        description: "Permanently removes a fund allocation from a roboadvisor portfolio.",
        tags: ["Bank account roboadvisor funds"],
        request: {
          params: BankAccountRoboadvisorFundIdParamSchema,
        },
        responses: {
          204: {
            description: "Fund allocation deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorFundIdParamSchema.parse(context.req.param());
        await this.roboadvisorsService.deleteBankAccountRoboadvisorFund(parseInt(id, 10));

        return context.body(null, 204);
      }
    );
  }
}

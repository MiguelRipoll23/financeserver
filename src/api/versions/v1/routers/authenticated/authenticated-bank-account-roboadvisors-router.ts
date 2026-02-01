import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountRoboadvisorsService } from "../../services/bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import {
  CreateBankAccountRoboadvisorRequestSchema,
  CreateBankAccountRoboadvisorResponseSchema,
  GetBankAccountRoboadvisorsRequestSchema,
  GetBankAccountRoboadvisorsResponseSchema,
  UpdateBankAccountRoboadvisorRequestSchema,
  UpdateBankAccountRoboadvisorResponseSchema,
  BankAccountRoboadvisorIdParamSchema,
} from "../../schemas/bank-account-roboadvisors-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedBankAccountRoboadvisorsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private roboadvisorsService = inject(BankAccountRoboadvisorsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListRoboadvisorsRoute();
    this.registerCreateRoboadvisorRoute();
    this.registerUpdateRoboadvisorRoute();
    this.registerDeleteRoboadvisorRoute();
  }

  private registerCreateRoboadvisorRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create roboadvisor portfolio",
        description:
          "Creates a new roboadvisor portfolio with fee configuration and risk level. Associates it with a bank account for automated investment management.",
        tags: ["Bank account roboadvisors"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Roboadvisor portfolio created successfully",
            content: {
              "application/json": {
                schema: CreateBankAccountRoboadvisorResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBankAccountRoboadvisorRequestSchema.parse(await context.req.json());
        const result = await this.roboadvisorsService.createBankAccountRoboadvisor(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListRoboadvisorsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List roboadvisor portfolios",
        description:
          "Returns paginated list of roboadvisor portfolios with optional filtering by bank account or name.",
        tags: ["Bank account roboadvisors"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Roboadvisor portfolios page",
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetBankAccountRoboadvisorsRequestSchema.parse(payload);
        const result = await this.roboadvisorsService.getBankAccountRoboadvisors(body);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateRoboadvisorRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update roboadvisor portfolio",
        description: "Updates an existing roboadvisor portfolio configuration by identifier.",
        tags: ["Bank account roboadvisors"],
        request: {
          params: BankAccountRoboadvisorIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Roboadvisor portfolio updated successfully",
            content: {
              "application/json": {
                schema: UpdateBankAccountRoboadvisorResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorIdParamSchema.parse(context.req.param());
        const body = UpdateBankAccountRoboadvisorRequestSchema.parse(await context.req.json());
        const result = await this.roboadvisorsService.updateBankAccountRoboadvisor(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteRoboadvisorRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete roboadvisor portfolio",
        description: "Permanently deletes a roboadvisor portfolio and all associated data.",
        tags: ["Bank account roboadvisors"],
        request: {
          params: BankAccountRoboadvisorIdParamSchema,
        },
        responses: {
          204: {
            description: "Roboadvisor portfolio deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorIdParamSchema.parse(context.req.param());
        await this.roboadvisorsService.deleteBankAccountRoboadvisor(parseInt(id, 10));

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

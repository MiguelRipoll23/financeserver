import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BankAccountRoboadvisorsService } from "../../services/bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import {
  BankAccountRoboadvisorIdParamSchema,
  CreateBankAccountRoboadvisorRequestSchema,
  CreateBankAccountRoboadvisorResponseSchema,
  GetBankAccountRoboadvisorsRequestSchema,
  GetBankAccountRoboadvisorsResponseSchema,
  UpdateBankAccountRoboadvisorRequestSchema,
  UpdateBankAccountRoboadvisorResponseSchema,
} from "../../schemas/bank-account-roboadvisors-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedBankAccountRoboadvisorsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {
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
        summary: "Create roboadvisor",
        description:
          "Creates a new roboadvisor with fee configuration and risk level. Associates it with a bank account for automated investment management.",
        tags: ["Roboadvisors"],
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
            description: "Roboadvisor created successfully",
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
        const body = CreateBankAccountRoboadvisorRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.roboadvisorsService
          .createBankAccountRoboadvisor(body);

        return context.json(result, 201);
      },
    );
  }

  private registerListRoboadvisorsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List roboadvisors",
        description:
          "Returns paginated list of roboadvisors with optional filtering by bank account or name.",
        tags: ["Roboadvisors"],
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
            description: "Roboadvisors page",
            content: {
              "application/json": {
                schema: GetBankAccountRoboadvisorsResponseSchema,
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
        const body = GetBankAccountRoboadvisorsRequestSchema.parse(payload);
        const result = await this.roboadvisorsService
          .getBankAccountRoboadvisors(body);

        return context.json(result, 200);
      },
    );
  }

  private registerUpdateRoboadvisorRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update roboadvisor",
        description:
          "Updates an existing roboadvisor configuration by identifier.",
        tags: ["Roboadvisors"],
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
            description: "Roboadvisor updated successfully",
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
        const { id } = BankAccountRoboadvisorIdParamSchema.parse(
          context.req.param(),
        );
        const body = UpdateBankAccountRoboadvisorRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.roboadvisorsService
          .updateBankAccountRoboadvisor(
            parseInt(id, 10),
            body,
          );

        return context.json(result, 200);
      },
    );
  }

  private registerDeleteRoboadvisorRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete roboadvisor",
        description:
          "Permanently deletes a roboadvisor and all associated data.",
        tags: ["Roboadvisors"],
        request: {
          params: BankAccountRoboadvisorIdParamSchema,
        },
        responses: {
          204: {
            description: "Roboadvisor deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = BankAccountRoboadvisorIdParamSchema.parse(
          context.req.param(),
        );
        await this.roboadvisorsService.deleteBankAccountRoboadvisor(
          parseInt(id, 10),
        );

        return context.body(null, 204);
      },
    );
  }
}

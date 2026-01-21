import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { CashService } from "../../services/cash/cash-service.ts";
import {
  CreateCashRequestSchema,
  CreateCashResponseSchema,
  UpdateCashRequestSchema,
  UpdateCashResponseSchema,
  CashIdParamSchema,
  GetCashRequestSchema,
  GetCashResponseSchema,
} from "../../schemas/cash-schemas.ts";
import type { CashFilter } from "../../interfaces/cash/cash-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedCashRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private cashService = inject(CashService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListCashRoute();
    this.registerCreateCashRoute();
    this.registerUpdateCashRoute();
    this.registerDeleteCashRoute();
  }

  private registerCreateCashRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create cash source",
        description: "Creates a new cash source for the authenticated user.",
        tags: ["Cash"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateCashRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Cash source created successfully",
            content: {
              "application/json": {
                schema: CreateCashResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateCashRequestSchema.parse(await context.req.json());
        const result = await this.cashService.createCash(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListCashRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List cash sources",
        description:
          "Returns paginated cash sources with optional filters supplied via JSON body.",
        tags: ["Cash"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetCashRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Cash sources page",
            content: {
              "application/json": {
                schema: GetCashResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetCashRequestSchema.parse(payload);
        const filter: CashFilter = {
          pageSize: body.limit,
          cursor: body.cursor,
          sortField: body.sortField,
          sortOrder: body.sortOrder,
          label: body.label,
        };
        const result = await this.cashService.getCash(filter);

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateCashRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update cash source",
        description: "Updates a cash source's details by identifier.",
        tags: ["Cash"],
        request: {
          params: CashIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateCashRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Cash source updated successfully",
            content: {
              "application/json": {
                schema: UpdateCashResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CashIdParamSchema.parse(context.req.param());
        const body = UpdateCashRequestSchema.parse(await context.req.json());
        const result = await this.cashService.updateCash(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteCashRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete cash source",
        description: "Permanently deletes a cash source and all its balances.",
        tags: ["Cash"],
        request: {
          params: CashIdParamSchema,
        },
        responses: {
          204: {
            description: "Cash source deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CashIdParamSchema.parse(context.req.param());
        await this.cashService.deleteCash(parseInt(id, 10));

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

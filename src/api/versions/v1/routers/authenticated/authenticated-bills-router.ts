import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BillsService } from "../../services/bills/bills-service.ts";
import {
  BillIdParamSchema,
  GetBillsRequestSchema,
  GetBillsResponseSchema,
  UpdateBillRequestSchema,
  UpdateBillResponseSchema,
  UpsertBillRequestSchema,
  UpsertBillResponseSchema,
} from "../../schemas/bills-schemas.ts";
import type { BillsFilter } from "../../interfaces/bills/bills-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedBillsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private billsService = inject(BillsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBillsRoute();
    this.registerUpsertBillRoute();
    this.registerUpdateBillRoute();
    this.registerDeleteBillRoute();
  }

  private registerUpsertBillRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/save",
        summary: "Save bill",
        description: "Creates or updates a bill entry for the provided date.",
        tags: ["Bills"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: UpsertBillRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bill stored successfully",
            content: {
              "application/json": {
                schema: UpsertBillResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = UpsertBillRequestSchema.parse(await context.req.json());
        const result = await this.billsService.upsertBill(body);

        return context.json(result, 200);
      }
    );
  }

  private registerListBillsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List bills",
        description:
          "Returns paginated bills with optional filters for dates, totals, and category supplied via JSON body.",
        tags: ["Bills"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetBillsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bills page",
            content: {
              "application/json": {
                schema: GetBillsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetBillsRequestSchema.parse(payload);
        const result = await this.billsService.getBills(body as BillsFilter);

        return context.json(result, 200);
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

  private registerUpdateBillRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update bill",
        description: "Updates bill metadata and total amount by identifier.",
        tags: ["Bills"],
        request: {
          params: BillIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBillRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bill updated successfully",
            content: {
              "application/json": {
                schema: UpdateBillResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Conflict,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BillIdParamSchema.parse(context.req.param());
        const payload = UpdateBillRequestSchema.parse(await context.req.json());

        const result = await this.billsService.updateBill(params.id, payload);

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteBillRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete bill",
        description: "Deletes a bill and its associated metadata.",
        tags: ["Bills"],
        request: {
          params: BillIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BillIdParamSchema.parse(context.req.param());
        await this.billsService.deleteBill(params.id);

        return context.body(null, 204);
      }
    );
  }
}
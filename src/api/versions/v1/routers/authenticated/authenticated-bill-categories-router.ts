import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { BillCategoriesService } from "../../services/bill-categories/bill-categories-service.ts";
import {
  BillCategoryIdParamSchema,
  CreateBillCategoryRequestSchema,
  CreateBillCategoryResponseSchema,
  GetBillCategoriesRequestSchema,
  GetBillCategoriesResponseSchema,
  BillCategorySchema,
  UpdateBillCategoryRequestSchema,
  UpdateBillCategoryResponseSchema,
} from "../../schemas/bill-categories-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedBillCategoriesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private billCategoriesService = inject(BillCategoriesService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBillCategoriesRoute();
    this.registerGetBillCategoryByIdRoute();
    this.registerCreateBillCategoryRoute();
    this.registerUpdateBillCategoryRoute();
    this.registerDeleteBillCategoryRoute();
  }

  private registerListBillCategoriesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/",
        summary: "List bill categories",
        description: "Returns paginated bill categories with optional filters.",
        tags: ["Bill Categories"],
        request: {
          query: GetBillCategoriesRequestSchema,
        },
        responses: {
          200: {
            description: "List of bill categories",
            content: {
              "application/json": {
                schema: GetBillCategoriesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const query = GetBillCategoriesRequestSchema.parse(context.req.query());
        const result = await this.billCategoriesService.getBillCategories(
          query,
        );

        return context.json(result, 200);
      },
    );
  }

  private registerGetBillCategoryByIdRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/{id}",
        summary: "Get bill category by ID",
        description: "Returns a single bill category by its unique identifier.",
        tags: ["Bill Categories"],
        request: {
          params: BillCategoryIdParamSchema,
        },
        responses: {
          200: {
            description: "Bill category details",
            content: {
              "application/json": {
                schema: BillCategorySchema,
              },
            },
          },
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BillCategoryIdParamSchema.parse(context.req.param());
        const result = await this.billCategoriesService.getBillCategoryById(
          params.id,
        );

        return context.json(result, 200);
      },
    );
  }

  private registerCreateBillCategoryRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create bill category",
        description: "Creates a new bill category.",
        tags: ["Bill Categories"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateBillCategoryRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Bill category created successfully",
            content: {
              "application/json": {
                schema: CreateBillCategoryResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Conflict,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateBillCategoryRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.billCategoriesService.createBillCategory(body);

        return context.json(result, 201);
      },
    );
  }

  private registerUpdateBillCategoryRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update bill category",
        description: "Updates an existing bill category by its unique identifier.",
        tags: ["Bill Categories"],
        request: {
          params: BillCategoryIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateBillCategoryRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bill category updated successfully",
            content: {
              "application/json": {
                schema: UpdateBillCategoryResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BillCategoryIdParamSchema.parse(context.req.param());
        const body = UpdateBillCategoryRequestSchema.parse(
          await context.req.json(),
        );

        const result = await this.billCategoriesService.updateBillCategory(
          params.id,
          body,
        );

        return context.json(result, 200);
      },
    );
  }

  private registerDeleteBillCategoryRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete bill category",
        description: "Deletes a bill category by its unique identifier.",
        tags: ["Bill Categories"],
        request: {
          params: BillCategoryIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = BillCategoryIdParamSchema.parse(context.req.param());
        await this.billCategoriesService.deleteBillCategory(params.id);

        return context.body(null, 204);
      },
    );
  }
}

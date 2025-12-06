import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { ProductsService } from "../../services/products/products-service.ts";
import {
  GetProductPriceDeltasQuery,
  GetProductPriceDeltasQuerySchema,
  GetProductPriceDeltasResponseSchema,
  GetProductsRequestSchema,
  GetProductsResponseSchema,
  ProductIdParamSchema,
  UpdateProductRequestSchema,
  UpdateProductResponseSchema,
} from "../../schemas/products-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { ProductFilter } from "../../interfaces/products/product-filter-interface.ts";

@injectable()
export class AuthenticatedProductsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private productsService = inject(ProductsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListProductsRoute();
    this.registerListPriceDeltasRoute();
    this.registerUpdateProductRoute();
    this.registerDeleteProductRoute();
  }

  private registerListProductsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List products",
        description: "Returns products with their latest unit price.",
        tags: ["Products"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetProductsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Products page",
            content: {
              "application/json": {
                schema: GetProductsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(c);
        const body = GetProductsRequestSchema.parse(payload);
        const result = await this.productsService.getProducts(
          body as ProductFilter
        );

        return c.json(result, 200);
      }
    );
  }

  private registerListPriceDeltasRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/list-price-deltas",
        summary: "List price deltas",
        description:
          "Returns product price variation within the selected date range.",
        tags: ["Products"],
        request: {
          query: GetProductPriceDeltasQuerySchema,
        },
        responses: {
          200: {
            description: "Price delta page",
            content: {
              "application/json": {
                schema: GetProductPriceDeltasResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const query = GetProductPriceDeltasQuerySchema.parse(c.req.query());
        const result = await this.productsService.getPriceDeltas(
          query as GetProductPriceDeltasQuery
        );

        return c.json(result, 200);
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

  private registerUpdateProductRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update product",
        description:
          "Updates the product name and creates or overwrites the unit price for the provided date.",
        tags: ["Products"],
        request: {
          params: ProductIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateProductRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Product updated successfully",
            content: {
              "application/json": {
                schema: UpdateProductResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Conflict,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = ProductIdParamSchema.parse(c.req.param());
        const payload = UpdateProductRequestSchema.parse(await c.req.json());

        const result = await this.productsService.updateProduct(
          params.id,
          payload
        );

        return c.json(result, 200);
      }
    );
  }

  private registerDeleteProductRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete product",
        description:
          "Removes a product that is not referenced by existing receipts.",
        tags: ["Products"],
        request: {
          params: ProductIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Conflict,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = ProductIdParamSchema.parse(c.req.param());
        await this.productsService.deleteProduct(params.id);

        return c.body(null, 204);
      }
    );
  }
}

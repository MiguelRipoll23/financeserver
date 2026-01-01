import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { MerchantsService } from "../../services/merchants/merchants-service.ts";
import {
  MerchantIdParamSchema,
  GetMerchantsRequestSchema,
  GetMerchantsResponseSchema,
  UpdateMerchantRequestSchema,
  UpdateMerchantResponseSchema,
  UpsertMerchantRequestSchema,
  UpsertMerchantResponseSchema,
} from "../../schemas/merchants-schemas.ts";
import type { MerchantsFilter } from "../../interfaces/merchants/merchants-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedMerchantsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private merchantsService = inject(MerchantsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListMerchantsRoute();
    this.registerCreateMerchantRoute();
    this.registerUpdateMerchantRoute();
    this.registerDeleteMerchantRoute();
  }

  private registerCreateMerchantRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create merchant",
        description: "Creates a new merchant entry.",
        tags: ["Merchants"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: UpsertMerchantRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Merchant created successfully",
            content: {
              "application/json": {
                schema: UpsertMerchantResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Conflict,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = UpsertMerchantRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.merchantsService.createMerchant(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListMerchantsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List merchants",
        description:
          "Returns paginated merchants with optional filters for name supplied via JSON body.",
        tags: ["Merchants"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetMerchantsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Merchants page",
            content: {
              "application/json": {
                schema: GetMerchantsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetMerchantsRequestSchema.parse(payload);
        const result = await this.merchantsService.getMerchants(
          body as MerchantsFilter
        );

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

  private registerUpdateMerchantRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update merchant",
        description: "Updates merchant name by identifier.",
        tags: ["Merchants"],
        request: {
          params: MerchantIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateMerchantRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Merchant updated successfully",
            content: {
              "application/json": {
                schema: UpdateMerchantResponseSchema,
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
        const params = MerchantIdParamSchema.parse(context.req.param());
        const payload = UpdateMerchantRequestSchema.parse(
          await context.req.json()
        );

        const result = await this.merchantsService.updateMerchant(
          params.id,
          payload
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteMerchantRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete merchant",
        description: "Deletes a merchant entry.",
        tags: ["Merchants"],
        request: {
          params: MerchantIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = MerchantIdParamSchema.parse(context.req.param());
        await this.merchantsService.deleteMerchant(params.id);

        return context.body(null, 204);
      }
    );
  }
}

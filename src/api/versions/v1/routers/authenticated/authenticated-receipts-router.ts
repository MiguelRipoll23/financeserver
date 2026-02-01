import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { ReceiptsService } from "../../services/receipts/receipts-service.ts";
import {
  CreateReceiptRequestSchema,
  CreateReceiptResponseSchema,
  GetReceiptsRequestSchema,
  GetReceiptsResponseSchema,
  ReceiptIdParamSchema,
  UpdateReceiptRequestSchema,
  UpdateReceiptResponseSchema,
} from "../../schemas/receipts-schemas.ts";
import type { ReceiptsFilter } from "../../interfaces/receipts/receipts-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { readJsonOrEmpty } from "../../utils/router-utils.ts";

@injectable()
export class AuthenticatedReceiptsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private receiptsService = inject(ReceiptsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListReceiptsRoute();
    this.registerCreateReceiptRoute();
    this.registerUpdateReceiptRoute();
    this.registerDeleteReceiptRoute();
  }

  private registerCreateReceiptRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/save",
        summary: "Create receipt",
        description: "Registers a finance receipt with its items.",
        tags: ["Receipts"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateReceiptRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Receipt stored successfully",
            content: {
              "application/json": {
                schema: CreateReceiptResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const payload = await c.req.json();
        const body = CreateReceiptRequestSchema.parse(payload);
        const result = await this.receiptsService.createReceipt(body);

        return c.json(result, 201);
      }
    );
  }

  private registerListReceiptsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List receipts",
        description:
          "Returns paginated receipts with optional date, total, and product filters supplied via JSON body.",
        tags: ["Receipts"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetReceiptsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Receipts page",
            content: {
              "application/json": {
                schema: GetReceiptsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const payload = await readJsonOrEmpty(c);
        const body = GetReceiptsRequestSchema.parse(payload);
        const result = await this.receiptsService.getReceipts(
          body as ReceiptsFilter
        );

        return c.json(result, 200);
      }
    );
  }

  private registerUpdateReceiptRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update receipt",
        description:
          "Replaces all items and metadata for the requested receipt.",
        tags: ["Receipts"],
        request: {
          params: ReceiptIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateReceiptRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Receipt updated successfully",
            content: {
              "application/json": {
                schema: UpdateReceiptResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = ReceiptIdParamSchema.parse(c.req.param());
        const payload = await c.req.json();
        const body = UpdateReceiptRequestSchema.parse(payload);
        const result = await this.receiptsService.updateReceipt(
          params.id,
          body
        );

        return c.json(result, 200);
      }
    );
  }

  private registerDeleteReceiptRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete receipt",
        description: "Deletes the requested receipt and its items.",
        tags: ["Receipts"],
        request: {
          params: ReceiptIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = ReceiptIdParamSchema.parse(c.req.param());
        await this.receiptsService.deleteReceipt(params.id);

        return c.body(null, 204);
      }
    );
  }
}

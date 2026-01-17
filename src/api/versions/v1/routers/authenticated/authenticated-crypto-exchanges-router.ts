import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { CryptoExchangesService } from "../../services/crypto-exchanges/crypto-exchanges-service.ts";
import {
  CreateCryptoExchangeRequestSchema,
  CreateCryptoExchangeResponseSchema,
  UpdateCryptoExchangeRequestSchema,
  UpdateCryptoExchangeResponseSchema,
  CryptoExchangeIdParamSchema,
  GetCryptoExchangesRequestSchema,
  GetCryptoExchangesResponseSchema,
} from "../../schemas/crypto-exchanges-schemas.ts";
import type { CryptoExchangesFilter } from "../../interfaces/crypto-exchanges/crypto-exchanges-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedCryptoExchangesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private cryptoExchangesService = inject(CryptoExchangesService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListCryptoExchangesRoute();
    this.registerCreateCryptoExchangeRoute();
    this.registerUpdateCryptoExchangeRoute();
    this.registerDeleteCryptoExchangeRoute();
  }

  private registerCreateCryptoExchangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create crypto exchange",
        description:
          "Creates a new crypto exchange for the authenticated user.",
        tags: ["Crypto exchanges"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateCryptoExchangeRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Crypto exchange created successfully",
            content: {
              "application/json": {
                schema: CreateCryptoExchangeResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateCryptoExchangeRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.cryptoExchangesService.createCryptoExchange(
          body
        );

        return context.json(result, 201);
      }
    );
  }

  private registerListCryptoExchangesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List crypto exchanges",
        description:
          "Returns paginated crypto exchanges with optional filters supplied via JSON body.",
        tags: ["Crypto exchanges"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetCryptoExchangesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Crypto exchanges page",
            content: {
              "application/json": {
                schema: GetCryptoExchangesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetCryptoExchangesRequestSchema.parse(payload);
        const filter: CryptoExchangesFilter = {
          pageSize: body.limit,
          cursor: body.cursor,
          sortField: body.sortField,
          sortOrder: body.sortOrder,
          name: body.name,
        };
        const result = await this.cryptoExchangesService.getCryptoExchanges(
          filter
        );

        return context.json(result, 200);
      }
    );
  }

  private registerUpdateCryptoExchangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update crypto exchange",
        description: "Updates a crypto exchange's details by identifier.",
        tags: ["Crypto exchanges"],
        request: {
          params: CryptoExchangeIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateCryptoExchangeRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Crypto exchange updated successfully",
            content: {
              "application/json": {
                schema: UpdateCryptoExchangeResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CryptoExchangeIdParamSchema.parse(context.req.param());
        const body = UpdateCryptoExchangeRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.cryptoExchangesService.updateCryptoExchange(
          parseInt(id, 10),
          body
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteCryptoExchangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete crypto exchange",
        description:
          "Permanently deletes a crypto exchange and all its balances.",
        tags: ["Crypto exchanges"],
        request: {
          params: CryptoExchangeIdParamSchema,
        },
        responses: {
          204: {
            description: "Crypto exchange deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CryptoExchangeIdParamSchema.parse(context.req.param());
        await this.cryptoExchangesService.deleteCryptoExchange(
          parseInt(id, 10)
        );

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
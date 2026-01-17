import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { CryptoExchangeBalancesService } from "../../services/crypto-exchanges-balances/crypto-exchange-balances-service.ts";
import {
  CreateCryptoExchangeBalanceRequestSchema,
  CreateCryptoExchangeBalanceResponseSchema,
  GetCryptoExchangeBalancesRequestSchema,
  GetCryptoExchangeBalancesResponseSchema,
  CryptoExchangeBalanceIdParamSchema,
  UpdateCryptoExchangeBalanceRequestSchema,
  UpdateCryptoExchangeBalanceResponseSchema,
} from "../../schemas/crypto-exchange-balances-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedCryptoExchangeBalancesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private cryptoExchangeBalancesService = inject(
      CryptoExchangeBalancesService,
    ),
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListBalancesRoute();
    this.registerCreateBalanceRoute();
    this.registerUpdateBalanceRoute();
    this.registerDeleteBalanceRoute();
  }

  private registerCreateBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create crypto exchange balance",
        description: "Adds a new balance entry for a specific crypto exchange.",
        tags: ["Crypto exchange balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateCryptoExchangeBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Balance created successfully",
            content: {
              "application/json": {
                schema: CreateCryptoExchangeBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateCryptoExchangeBalanceRequestSchema.parse(
          await context.req.json(),
        );
        const result =
          await this.cryptoExchangeBalancesService.createCryptoExchangeBalance(
            body.cryptoExchangeId,
            body,
          );

        return context.json(result, 201);
      },
    );
  }

  private registerListBalancesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List crypto exchange balances",
        description:
          "Returns paginated balances for a specific crypto exchange.",
        tags: ["Crypto exchange balances"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: GetCryptoExchangeBalancesRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Balances page",
            content: {
              "application/json": {
                schema: GetCryptoExchangeBalancesResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = GetCryptoExchangeBalancesRequestSchema.parse(
          await context.req.json(),
        );
        const result =
          await this.cryptoExchangeBalancesService.getCryptoExchangeBalances({
            cryptoExchangeId: body.cryptoExchangeId,
            limit: body.limit,
            cursor: body.cursor,
            sortOrder: body.sortOrder,
          });

        return context.json(result, 200);
      },
    );
  }

  private registerUpdateBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update crypto exchange balance",
        description: "Updates a specific balance entry.",
        tags: ["Crypto exchange balances"],
        request: {
          params: CryptoExchangeBalanceIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateCryptoExchangeBalanceRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Balance updated successfully",
            content: {
              "application/json": {
                schema: UpdateCryptoExchangeBalanceResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CryptoExchangeBalanceIdParamSchema.parse(
          context.req.param(),
        );
        const body = UpdateCryptoExchangeBalanceRequestSchema.parse(
          await context.req.json(),
        );
        const result =
          await this.cryptoExchangeBalancesService.updateCryptoExchangeBalance(
            parseInt(id, 10),
            body,
          );

        return context.json(result, 200);
      },
    );
  }

  private registerDeleteBalanceRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete crypto exchange balance",
        description: "Permanently deletes a specific balance entry.",
        tags: ["Crypto exchange balances"],
        request: {
          params: CryptoExchangeBalanceIdParamSchema,
        },
        responses: {
          204: {
            description: "Balance deleted successfully",
          },
          ...ServerResponse.Unauthorized,
          ...ServerResponse.NotFound,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const { id } = CryptoExchangeBalanceIdParamSchema.parse(
          context.req.param(),
        );
        await this.cryptoExchangeBalancesService.deleteCryptoExchangeBalance(
          parseInt(id, 10),
        );

        return context.body(null, 204);
      },
    );
  }
}

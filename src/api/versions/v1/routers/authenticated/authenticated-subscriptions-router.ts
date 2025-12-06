import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { SubscriptionsService } from "../../services/subscriptions/subscriptions-service.ts";
import {
  SubscriptionIdParamSchema,
  GetSubscriptionsRequestSchema,
  GetSubscriptionsResponseSchema,
  UpdateSubscriptionRequestSchema,
  UpdateSubscriptionResponseSchema,
  UpsertSubscriptionRequestSchema,
  UpsertSubscriptionResponseSchema,
} from "../../schemas/subscriptions-schemas.ts";
import type { SubscriptionsFilter } from "../../interfaces/subscriptions/subscriptions-filter-interface.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedSubscriptionsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private subscriptionsService = inject(SubscriptionsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListSubscriptionsRoute();
    this.registerCreateSubscriptionRoute();
    this.registerUpdateSubscriptionRoute();
    this.registerDeleteSubscriptionRoute();
  }

  private registerCreateSubscriptionRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create subscription",
        description: "Creates a new subscription entry.",
        tags: ["Subscriptions"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: UpsertSubscriptionRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Subscription created successfully",
            content: {
              "application/json": {
                schema: UpsertSubscriptionResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = UpsertSubscriptionRequestSchema.parse(
          await context.req.json()
        );
        const result = await this.subscriptionsService.createSubscription(body);

        return context.json(result, 201);
      }
    );
  }

  private registerListSubscriptionsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/find",
        summary: "List subscriptions",
        description:
          "Returns paginated subscriptions with optional filters for name, category, recurrence, dates, and active status supplied via JSON body.",
        tags: ["Subscriptions"],
        request: {
          body: {
            required: false,
            content: {
              "application/json": {
                schema: GetSubscriptionsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Subscriptions page",
            content: {
              "application/json": {
                schema: GetSubscriptionsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const payload = await this.readJsonOrEmpty(context);
        const body = GetSubscriptionsRequestSchema.parse(payload);
        const result = await this.subscriptionsService.getSubscriptions(
          body as SubscriptionsFilter
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

  private registerUpdateSubscriptionRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update subscription",
        description: "Updates subscription details by identifier.",
        tags: ["Subscriptions"],
        request: {
          params: SubscriptionIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateSubscriptionRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Subscription updated successfully",
            content: {
              "application/json": {
                schema: UpdateSubscriptionResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = SubscriptionIdParamSchema.parse(context.req.param());
        const payload = UpdateSubscriptionRequestSchema.parse(
          await context.req.json()
        );

        const result = await this.subscriptionsService.updateSubscription(
          params.id,
          payload
        );

        return context.json(result, 200);
      }
    );
  }

  private registerDeleteSubscriptionRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete subscription",
        description: "Deletes a subscription and its associated metadata.",
        tags: ["Subscriptions"],
        request: {
          params: SubscriptionIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = SubscriptionIdParamSchema.parse(context.req.param());
        await this.subscriptionsService.deleteSubscription(params.id);

        return context.body(null, 204);
      }
    );
  }
}

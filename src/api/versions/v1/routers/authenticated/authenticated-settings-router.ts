import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { SettingsService } from "../../services/settings/settings-service.ts";
import {
  GetSettingsResponseSchema,
  UpdateSettingsRequestSchema,
} from "../../schemas/settings-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedSettingsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private settingsService = inject(SettingsService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerGetSettingsRoute();
    this.registerUpdateSettingsRoute();
  }

  private registerGetSettingsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/",
        summary: "Get settings",
        description: "Returns current user settings.",
        tags: ["Settings"],
        responses: {
          200: {
            description: "Current settings",
            content: {
              "application/json": {
                schema: GetSettingsResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.settingsService.getSettings();
        return context.json(result, 200);
      },
    );
  }

  private registerUpdateSettingsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/",
        summary: "Update settings",
        description: "Updates user settings.",
        tags: ["Settings"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: UpdateSettingsRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated settings",
            content: {
              "application/json": {
                schema: GetSettingsResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = UpdateSettingsRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.settingsService.updateSettings(body);
        return context.json(result, 200);
      },
    );
  }
}

import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { UsersService } from "../../services/users/users-service.ts";
import {
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  UpdateUserRequestSchema,
  UpdateUserResponseSchema,
  UserIdParamSchema,
} from "../../schemas/users-schemas.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class AuthenticatedUsersRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private usersService = inject(UsersService)) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerCreateUserRoute();
    this.registerUpdateUserRoute();
    this.registerDeleteUserRoute();
  }

  private registerCreateUserRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/authorize",
        summary: "Add user",
        description: "Creates a new user tied to a GitHub handle.",
        tags: ["Users"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateUserRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: CreateUserResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Conflict,
          ...ServerResponse.Forbidden,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const payload = await c.req.json();
        const body = CreateUserRequestSchema.parse(payload);
        const result = await this.usersService.createUser(body);

        return c.json(result, 201);
      }
    );
  }

  private registerUpdateUserRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update user",
        description: "Updates the GitHub handle or display name for an user.",
        tags: ["Users"],
        request: {
          params: UserIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateUserRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "User updated",
            content: {
              "application/json": {
                schema: UpdateUserResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Conflict,
          ...ServerResponse.Forbidden,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = UserIdParamSchema.parse(c.req.param());
        const payload = await c.req.json();
        const body = UpdateUserRequestSchema.parse(payload);
        const result = await this.usersService.updateUser(params.id, body);

        return c.json(result, 200);
      }
    );
  }

  private registerDeleteUserRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete user",
        description:
          "Removes an user and revokes MCP access for the GitHub handle.",
        tags: ["Users"],
        request: {
          params: UserIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Forbidden,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const params = UserIdParamSchema.parse(c.req.param());
        await this.usersService.deleteUser(params.id);

        return c.body(null, 204);
      }
    );
  }
}

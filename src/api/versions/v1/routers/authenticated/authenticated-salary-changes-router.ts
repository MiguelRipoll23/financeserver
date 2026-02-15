import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { SalaryChangesService } from "../../services/salary-changes/salary-changes-service.ts";
import {
  CreateSalaryChangeRequestSchema,
  CreateSalaryChangeResponseSchema,
  GetSalaryChangesResponseSchema,
  ListSalaryChangesRequestBodySchema,
  SalaryChangeIdParamSchema,
  UpdateSalaryChangeRequestSchema,
  UpdateSalaryChangeResponseSchema,
} from "../../schemas/salary-changes-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

@injectable()
export class AuthenticatedSalaryChangesRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private salaryChangesService = inject(SalaryChangesService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListSalaryChangesRoute();
    this.registerCreateSalaryChangeRoute();
    this.registerUpdateSalaryChangeRoute();
    this.registerDeleteSalaryChangeRoute();
  }

  private registerListSalaryChangesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/list",
        summary: "List salary changes",
        description: "Returns paginated salary changes with optional filters.",
        tags: ["Salary changes"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: ListSalaryChangesRequestBodySchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "List of salary changes",
            content: {
              "application/json": {
                schema: GetSalaryChangesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = ListSalaryChangesRequestBodySchema.parse(
          await context.req.json(),
        );
        const result = await this.salaryChangesService.getSalaryChanges(body);

        return context.json(result, 200);
      },
    );
  }

  private registerCreateSalaryChangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/",
        summary: "Create salary change",
        description: "Creates a new salary change.",
        tags: ["Salary changes"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: CreateSalaryChangeRequestSchema,
              },
            },
          },
        },
        responses: {
          201: {
            description: "Salary change created successfully",
            content: {
              "application/json": {
                schema: CreateSalaryChangeResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const body = CreateSalaryChangeRequestSchema.parse(
          await context.req.json(),
        );
        const result = await this.salaryChangesService.createSalaryChange(body);

        return context.json(result, 201);
      },
    );
  }

  private registerUpdateSalaryChangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "patch",
        path: "/{id}",
        summary: "Update salary change",
        description:
          "Updates an existing salary change by its unique identifier.",
        tags: ["Salary changes"],
        request: {
          params: SalaryChangeIdParamSchema,
          body: {
            content: {
              "application/json": {
                schema: UpdateSalaryChangeRequestSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Salary change updated successfully",
            content: {
              "application/json": {
                schema: UpdateSalaryChangeResponseSchema,
              },
            },
          },
          ...ServerResponse.BadRequest,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = SalaryChangeIdParamSchema.parse(context.req.param());
        const body = UpdateSalaryChangeRequestSchema.parse(
          await context.req.json(),
        );

        const result = await this.salaryChangesService.updateSalaryChange(
          params.id,
          body,
        );

        return context.json(result, 200);
      },
    );
  }

  private registerDeleteSalaryChangeRoute(): void {
    this.app.openapi(
      createRoute({
        method: "delete",
        path: "/{id}",
        summary: "Delete salary change",
        description: "Deletes a salary change by its unique identifier.",
        tags: ["Salary changes"],
        request: {
          params: SalaryChangeIdParamSchema,
        },
        responses: {
          ...ServerResponse.NoContent,
          ...ServerResponse.NotFound,
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const params = SalaryChangeIdParamSchema.parse(context.req.param());
        await this.salaryChangesService.deleteSalaryChange(params.id);

        return context.body(null, 204);
      },
    );
  }
}

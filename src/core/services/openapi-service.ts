import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { HonoVariables } from "../types/hono/hono-variables-type.ts";

export class OpenAPIService {
  public static configure(
    app: OpenAPIHono<{ Variables: HonoVariables }>
  ): void {
    app.openAPIRegistry.registerComponent("securitySchemes", "bearer", {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  }

  public static setRoutes(
    app: OpenAPIHono<{ Variables: HonoVariables }>
  ): void {
    app.doc31("/.well-known/openapi", {
      openapi: "3.1.0",
      info: {
        version: "1.0.0",
        title: "Finance server API",
        description: "A finance server built with Deno",
      },
    });

    app.get(
      "/",
      Scalar({
        url: "/.well-known/openapi",
        pageTitle: "Finance server API",
        metaData: {
          title: "Finance server API",
          description: "A finance server built for Deno",
          ogTitle: "Finance server API",
          ogDescription: "A finance server built for Deno",
        },
        defaultOpenAllTags: true,
        authentication: {
          preferredSecurityScheme: "bearer",
        },
        persistAuth: true,
      })
    );
  }
}

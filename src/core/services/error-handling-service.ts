import { HTTPException } from "hono/http-exception";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { ServerError } from "../../api/versions/v1/models/server-error.ts";
import { HonoVariables } from "../types/hono/hono-variables-type.ts";
import { UrlUtils } from "../utils/url-utils.ts";

export class ErrorHandlingService {
  public static configure(
    app: OpenAPIHono<{ Variables: HonoVariables }>
  ): void {
    app.onError((error, context) => {
      console.error(error);

      if (error instanceof HTTPException) {
        return context.json(
          this.createResponse("HTTP_ERROR", error.message),
          error.status
        );
      } else if (error instanceof ServerError) {
        const response = this.createResponse(
          error.getCode(),
          error.getMessage()
        );

        ErrorHandlingService.addWwwAuthenticateHeaderIfUnauthorized(
          context,
          error.getStatusCode()
        );

        return context.json(response, error.getStatusCode());
      }

      return context.json(
        this.createResponse("FATAL_ERROR", "Internal server error"),
        500
      );
    });
  }

  private static addWwwAuthenticateHeaderIfUnauthorized(
    c: Context<{ Variables: HonoVariables }>,
    statusCode: number
  ): void {
    // Add WWW-Authenticate header for 401 responses per RFC 9728
    if (statusCode === 401) {
      const applicationBaseURL = UrlUtils.getApplicationBaseURL(c.req.url);
      const protectedResourceMetadataUrl = new URL(
        "/.well-known/oauth-protected-resource",
        applicationBaseURL
      ).toString();
      c.header(
        "WWW-Authenticate",
        `Bearer realm="${protectedResourceMetadataUrl}"`
      );
    }
  }

  private static createResponse(code: string, message: string) {
    return {
      code,
      message,
    };
  }
}

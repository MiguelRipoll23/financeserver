import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { ConversationsService } from "../../services/conversations/conversations-service.ts";
import {
  SendMessageSchema,
  SessionIdParamSchema,
  UploadImageRequestSchema,
} from "../../schemas/conversations-schemas.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import type { Context } from "hono";
import { streamText } from "hono/streaming";
import { z } from "@hono/zod-openapi";
import { ServerError } from "../../models/server-error.ts";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from "../../constants/api-constants.ts";

@injectable()
export class AuthenticatedConversationsRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private conversationsService = inject(ConversationsService)) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerListModelsRoute();
    this.registerStreamMessageRoute();
    this.registerUploadImageRoute();
  }

  private registerListModelsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/models",
        summary: "List available models",
        description:
          "Returns a list of available models that can be used for conversations.",
        tags: ["Conversations"],
        responses: {
          200: {
            description: "List of available models",
            content: {
              "application/json": {
                schema: z.object({
                  models: z.array(z.any()),
                }),
              },
            },
          },
          500: {
            description: "Internal Server Error",
          },
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const models = await this.conversationsService.listModels();
        return c.json({ models });
      },
    );
  }

  private registerStreamMessageRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/stream-message",
        summary: "Stream a message",
        description:
          "Sends a message and streams the response back as text chunks.",
        tags: ["Conversations"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: SendMessageSchema,
              },
            },
            required: true,
          },
        },
        responses: {
          200: {
            description: "Streaming response",
            content: {
              "text/plain": {
                schema: z.string(),
              },
            },
          },
          400: {
            description: "Bad Request",
          },
          500: {
            description: "Internal Server Error",
          },
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        try {
          const body = await c.req.json();
          const payload = SendMessageSchema.parse(body);
          const stream = await this.conversationsService.streamMessage(payload);

          return streamText(c, async (streamWriter) => {
            const reader = stream.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await streamWriter.write(value);
              }
            } finally {
              reader.releaseLock();
            }
          });
        } catch (error) {
          // Handle errors BEFORE streaming starts
          if (error instanceof ServerError) {
            return c.json(
              { code: error.getCode(), message: error.getMessage() },
              error.getStatusCode(),
            );
          }
          throw error;
        }
      },
    );
  }

  private registerUploadImageRoute(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/{sessionId}/upload-image",
        summary: "Upload an image",
        description:
          "Uploads an image to be attached to the next message in the specified conversation session.",
        tags: ["Conversations"],
        request: {
          params: SessionIdParamSchema,
          body: {
            content: {
              "multipart/form-data": {
                schema: UploadImageRequestSchema,
              },
            },
            required: true,
          },
        },
        responses: {
          200: {
            description: "Image uploaded successfully",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.boolean(),
                }),
              },
            },
          },
          400: {
            description: "Bad Request",
          },
          500: {
            description: "Internal Server Error",
          },
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const { sessionId } = SessionIdParamSchema.parse(c.req.param());
        const body = await c.req.parseBody();

        if (!(body["image"] instanceof File)) {
          return c.json(
            { code: "INVALID_IMAGE", message: "No image file provided" },
            400,
          );
        }

        const imageFile = body["image"];

        if (!ALLOWED_IMAGE_MIME_TYPES.includes(imageFile.type as any)) {
          return c.json(
            {
              code: "INVALID_IMAGE_TYPE",
              message: `Invalid image type. Allowed types: ${
                ALLOWED_IMAGE_MIME_TYPES.join(", ")
              }`,
            },
            400,
          );
        }

        if (imageFile.size > MAX_IMAGE_BYTES) {
          return c.json(
            {
              code: "IMAGE_TOO_LARGE",
              message: `Image size exceeds maximum allowed size of ${
                MAX_IMAGE_BYTES / 1024 / 1024
              } MB`,
            },
            400,
          );
        }

        await this.conversationsService.attachImage(sessionId, imageFile);

        return c.json({ success: true });
      },
    );
  }
}

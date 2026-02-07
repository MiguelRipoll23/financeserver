import { Context } from "hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { CopilotService } from "../../services/copilot/copilot-service.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";

const SendMessageSchema = z.object({
  sessionId: z.string(),
  mcpServer: z.enum(["GLOBAL", "PORTFOLIO", "EXPENSES"]),
  model: z.string(),
  userMessage: z.string(),
});

@injectable()
export class PublicTestRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private copilotService = inject(CopilotService),
  ) {
    this.app = new OpenAPIHono();
    this.registerRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private registerRoutes(): void {
    this.app.openapi(
      createRoute({
        method: "post",
        path: "/sendandwait",
        summary: "Test sendAndWait",
        description: "Test endpoint using sendAndWait - NO AUTH",
        tags: ["Test"],
        request: {
          body: {
            content: {
              "application/json": {
                schema: SendMessageSchema,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Message response",
            content: {
              "application/json": {
                schema: z.object({
                  content: z.string(),
                }),
              },
            },
          },
        },
      }),
      async (c: Context<{ Variables: HonoVariables }>) => {
        const body = await c.req.json();
        const payload = SendMessageSchema.parse(body);
        const content = await this.copilotService.sendAndWaitMessage(payload);
        return c.json({ content });
      },
    );
  }
}

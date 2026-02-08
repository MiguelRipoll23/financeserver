import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { StreamableHTTPTransport } from "@hono/mcp";
import type { Context } from "hono";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCPService } from "../../services/mcp-server.ts";
import { ServerResponse } from "../../models/server-response.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import type { McpHttpMethod } from "../../types/mcp/mcp-http-method-type.ts";
import type { McpServerFactory } from "../../types/mcp/mcp-server-factory-type.ts";

@injectable()
export class AuthenticatedMCPRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private mcpService = inject(MCPService)) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerMcpRoutes(
      "/global",
      "Connect global",
      "Establishes a unified streaming Model Context Protocol session with access to all financial tools.",
      () => this.mcpService.createUnifiedServer(),
    );

    this.registerMcpRoutes(
      "/portfolio",
      "Connect portfolio",
      "Establishes a portfolio-focused streaming Model Context Protocol session for bank accounts, crypto exchanges, and balances.",
      () => this.mcpService.createPortfolioServer(),
    );

    this.registerMcpRoutes(
      "/expenses",
      "Connect expenses",
      "Establishes an expenses-focused streaming Model Context Protocol session for bills, receipts, and subscriptions.",
      () => this.mcpService.createExpensesServer(),
    );
  }

  private registerMcpRoutes(
    path: string,
    summary: string,
    description: string,
    serverFactory: McpServerFactory,
  ): void {
    const methods: McpHttpMethod[] = ["get", "post"];

    for (const method of methods) {
      this.app.openapi(
        createRoute({
          method,
          path,
          summary,
          description,
          tags: ["MCP"],
          responses: {
            ...ServerResponse.SwitchingProtocols,
            ...ServerResponse.BadRequest,
            ...ServerResponse.Forbidden,
            ...ServerResponse.Unauthorized,
          },
        }),
        async (context: Context<{ Variables: HonoVariables }>) => {
          const userId = context.var.userId;
          const transport = new StreamableHTTPTransport();
          const server = serverFactory();

          // Store user ID in server context for tool execution
          (server as McpServer & { _userId?: string })._userId = userId;

          await server.connect(transport);

          const response = await transport.handleRequest(context);

          if (!response) {
            console.error(`MCP transport failed for ${path}`);
            return context.text("MCP transport negotiation failed", 400);
          }

          return response;
        },
      );
    }
  }
}

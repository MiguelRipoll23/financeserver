import { inject, injectable } from "@needle-di/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReceiptsMCPService } from "./receipts/receipts-mcp-service.ts";
import { ProductsMCPService } from "./products/products-mcp-service.ts";
import { BillsMCPService } from "./bills/bills-mcp-service.ts";
import { SubscriptionsMCPService } from "./subscriptions/subscriptions-mcp-service.ts";
import { MerchantsMCPService } from "./merchants/merchants-mcp-service.ts";
import { BankAccountsMCPService } from "./bank-accounts/bank-accounts-mcp-service.ts";
import { BankAccountBalancesMCPService } from "./bank-account-balances/bank-account-balances-mcp-service.ts";
import { CryptoExchangesMCPService } from "./crypto-exchanges/crypto-exchanges-mcp-service.ts";
import { McpToolDefinition } from "../interfaces/mcp/mcp-tool-interface.ts";
import { McpProvider } from "../types/mcp/mcp-provider-type.ts";
import { McpServerWithContext } from "../types/mcp/mcp-server-with-context-type.ts";

@injectable()
export class MCPService {
  constructor(
    private receiptsMCPService = inject(ReceiptsMCPService),
    private productsMCPService = inject(ProductsMCPService),
    private billsMCPService = inject(BillsMCPService),
    private subscriptionsMCPService = inject(SubscriptionsMCPService),
    private merchantsMCPService = inject(MerchantsMCPService),
    private bankAccountsMCPService = inject(BankAccountsMCPService),
    private bankAccountBalancesMCPService = inject(
      BankAccountBalancesMCPService
    ),
    private cryptoExchangesMCPService = inject(CryptoExchangesMCPService)
  ) {}

  public createUnifiedServer(): McpServer {
    return this.createServer("finance-mcp", [
      this.receiptsMCPService,
      this.productsMCPService,
      this.billsMCPService,
      this.subscriptionsMCPService,
      this.merchantsMCPService,
      this.bankAccountsMCPService,
      this.bankAccountBalancesMCPService,
      this.cryptoExchangesMCPService,
    ]);
  }

  public createPortfolioServer(): McpServer {
    return this.createServer("portfolio-mcp", [
      this.bankAccountsMCPService,
      this.bankAccountBalancesMCPService,
      this.cryptoExchangesMCPService,
    ]);
  }

  public createExpensesServer(): McpServer {
    return this.createServer("expenses-mcp", [
      this.billsMCPService,
      this.receiptsMCPService,
      this.subscriptionsMCPService,
    ]);
  }

  private createServer(name: string, providers: McpProvider[]): McpServer {
    const server = new McpServer({ name, version: "1.0.0" });

    for (const provider of providers) {
      const tools = provider.getTools();

      this.registerTools(server, tools);
    }

    return server;
  }

  private registerTools(server: McpServer, tools: McpToolDefinition[]): void {
    for (const tool of tools) {
      server.registerTool(tool.name, tool.meta, async (input, _extra) => {
        const userId = (server as McpServerWithContext)._userId || "unknown";
        const formattedInput = JSON.stringify(input, null, 2);

        console.log(
          `Tool ${tool.name} called by ${userId} with input:\n${formattedInput}`
        );

        const startTime = Date.now();

        try {
          const result = await tool.run(input);
          const executionTime = Date.now() - startTime;
          const structuredOutput = result.structured
            ? `\nStructured:\n${JSON.stringify(result.structured, null, 2)}`
            : "";

          console.log(
            `Tool ${tool.name} executed by ${userId} (${executionTime}ms) with output:\n${result.text}${structuredOutput}`
          );

          const structured =
            result.structured && typeof result.structured === "object"
              ? Array.isArray(result.structured)
                ? { items: result.structured }
                : (result.structured as Record<string, unknown>)
              : undefined;

          return {
            content: [{ type: "text" as const, text: result.text }],
            ...(structured ? { structuredContent: structured } : {}),
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;
          const logMessage = `Tool ${tool.name} executed by ${userId} (${executionTime}ms) failed with error:`;
          console.error(logMessage, error);

          // Return error as text content for MCP client
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          return {
            content: [
              { type: "text" as const, text: `Error: ${errorMessage}` },
            ],
            isError: true,
          };
        }
      });
    }
  }
}

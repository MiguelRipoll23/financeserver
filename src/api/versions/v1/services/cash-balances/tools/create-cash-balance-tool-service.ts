import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../../cash/cash-service.ts";
import { CreateCashBalanceToolSchema } from "../../../schemas/mcp-cash-balances-schemas.ts";

@injectable()
export class CreateCashBalanceToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash_balances.create",
      meta: {
        title: "Create cash balance",
        description:
          "Use this when you need to create a new cash balance record.",
        inputSchema: CreateCashBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateCashBalanceToolSchema.parse(input);

        const result = await this.cashService.createCashBalance({
          cashId: parsed.cashId,
          balance: parsed.balance,
          currencyCode: parsed.currencyCode,
        });

        const text =
          `Cash balance created successfully: ${result.balance} ${result.currencyCode} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

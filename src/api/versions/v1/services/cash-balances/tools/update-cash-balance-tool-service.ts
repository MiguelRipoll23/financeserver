import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../../cash/cash-service.ts";
import { UpdateCashBalanceToolSchema } from "../../../schemas/mcp-cash-balances-schemas.ts";

@injectable()
export class UpdateCashBalanceToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash_balances.update",
      meta: {
        title: "Update cash balance",
        description:
          "Use this when you need to update an existing cash balance's details. Do not use for creating or deleting cash balances.",
        inputSchema: UpdateCashBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateCashBalanceToolSchema.parse(input);

        const result = await this.cashService.updateCashBalance(parsed.id, {
          balance: parsed.balance,
          currencyCode: parsed.currencyCode,
        });

        const text =
          `Cash balance updated successfully: ${result.balance} ${result.currencyCode} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

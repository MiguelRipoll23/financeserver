import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../../cash/cash-service.ts";
import { DeleteCashBalanceToolSchema } from "../../../schemas/mcp-cash-balances-schemas.ts";

@injectable()
export class DeleteCashBalanceToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash_balances.delete",
      meta: {
        title: "Delete cash balance",
        description:
          "Use this when you need to permanently delete a cash balance record. Do not use for creating or updating cash balances.",
        inputSchema: DeleteCashBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteCashBalanceToolSchema.parse(input);

        await this.cashService.deleteCashBalance(parsed.id);

        const text = `Cash balance with ID ${parsed.id} deleted successfully`;

        return {
          text,
        };
      },
    };
  }
}

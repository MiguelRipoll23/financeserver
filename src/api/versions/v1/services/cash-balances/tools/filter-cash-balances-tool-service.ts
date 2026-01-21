import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../../cash/cash-service.ts";
import { FilterCashBalancesToolSchema } from "../../../schemas/mcp-cash-balances-schemas.ts";

@injectable()
export class FilterCashBalancesToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash_balances.filter",
      meta: {
        title: "Filter cash balances",
        description:
          "Use this when you need to search and filter cash balances for a specific cash source with optional sorting and pagination.",
        inputSchema: FilterCashBalancesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterCashBalancesToolSchema.parse(input);

        const result = await this.cashService.getCashBalances({
          cashId: parsed.cashId,
          limit: parsed.limit,
          cursor: parsed.cursor,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        const count = result.data.length;
        const balancesList = result.data
          .map(
            (balance) =>
              `- ${balance.balance} ${balance.currencyCode} (ID: ${balance.id}, Created: ${balance.createdAt})`,
          )
          .join("\n");

        let text = `Found ${count} cash balance${count !== 1 ? "s" : ""}`;
        if (count > 0) {
          text += `:\n${balancesList}`;
        }

        if (result.nextCursor) {
          text += `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

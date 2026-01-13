import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { FilterBankAccountBalancesToolSchema } from "../../../schemas/mcp-bank-account-balances-schemas.ts";

@injectable()
export class FilterBalancesToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.filter_balances",
      meta: {
        title: "Filter bank account balances",
        description:
          "Use this when you need to retrieve the balance history for a specific bank account with optional sorting and pagination.",
        inputSchema: FilterBankAccountBalancesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBankAccountBalancesToolSchema.parse(input);

        const result = await this.bankAccountsService.getBankAccountBalances({
          bankAccountId: parsed.bankAccountId,
          limit: parsed.pageSize,
          cursor: parsed.cursor,
          sortOrder: parsed.sortOrder,
        });

        const count = result.data.length;
        const balancesList = result.data
          .map(
            (balance) =>
              `- ${balance.balance} ${balance.currencySymbol} (${balance.createdAt})`
          )
          .join("\n");

        let text = `Found ${count} balance record${count !== 1 ? "s" : ""}`;
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

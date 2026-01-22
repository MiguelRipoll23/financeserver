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
          "Use this when you need to retrieve the balance history for bank accounts with optional sorting and pagination. You can optionally specify a bankAccountId to filter by a specific account, or omit it to retrieve all balances across all accounts. Do not use for creating, updating, or deleting bank account balances.",
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
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        const count = result.results.length;
        const balancesList = result.results
          .map((balance) => {
            const interestPart = balance.interestRate
              ? ` [Interest: ${balance.interestRate}%]`
              : "";
            return `- ${balance.balance} ${balance.currencyCode}${interestPart} (Account ID: ${balance.bankAccountId}, ${balance.createdAt})`;
          })
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

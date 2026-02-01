import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { FilterBankAccountRoboadvisorBalancesToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-balances-schemas.ts";

@injectable()
export class FilterRoboadvisorBalancesToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.balances.filter",
      meta: {
        title: "Filter roboadvisor balance entries",
        description:
          "Use this when you need to retrieve balance history for roboadvisor portfolios with optional filtering and pagination.",
        inputSchema: FilterBankAccountRoboadvisorBalancesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed =
          FilterBankAccountRoboadvisorBalancesToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.getBankAccountRoboadvisorBalances({
            bankAccountRoboadvisorId: parsed.bankAccountRoboadvisorId,
            pageSize: parsed.pageSize,
            cursor: parsed.cursor,
            sortField: parsed.sortField,
            sortOrder: parsed.sortOrder,
          });

        const count = result.results.length;
        const balancesList = result.results
          .map((balance) => {
            return `- ${balance.type}: ${balance.amount} ${balance.currencyCode} on ${balance.date} (ID: ${balance.id})`;
          })
          .join("\n");

        let text = `Found ${count} balance entr${count !== 1 ? "ies" : "y"}`;
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

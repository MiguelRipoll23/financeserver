import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../bank-accounts-service.ts";
import { FilterBankAccountsToolSchema } from "../../../schemas/mcp-bank-accounts-schemas.ts";

@injectable()
export class FilterBankAccountsToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.filter",
      meta: {
        title: "Filter bank accounts",
        description:
          "Use this when you need to search and filter bank accounts with optional sorting and pagination.",
        inputSchema: FilterBankAccountsToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBankAccountsToolSchema.parse(input);

        const result = await this.bankAccountsService.getBankAccounts({
          name: parsed.name,
          type: parsed.type,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
          pageSize: parsed.pageSize,
          cursor: parsed.cursor,
        });

        const count = result.results.length;
        const accountsList = result.results
          .map((account) => `- ${account.name} (${account.type}) (ID: ${account.id})`)
          .join("\n");

        let text = `Found ${count} bank account${count !== 1 ? "s" : ""}`;
        if (count > 0) {
          text += `:\n${accountsList}`;
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

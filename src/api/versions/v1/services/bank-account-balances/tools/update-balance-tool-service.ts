import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { UpdateBalanceToolSchema } from "../../../schemas/mcp-bank-account-balances-schemas.ts";

@injectable()
export class UpdateBalanceToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.update_balance",
      meta: {
        title: "Update bank account balance",
        description:
          "Use this when you need to update an existing balance record. Do not use for adding or deleting balances.",
        inputSchema: UpdateBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBalanceToolSchema.parse(input);

        const result = await this.bankAccountsService.updateBankAccountBalance(
          parsed.id,
          {
            balance: parsed.balance,
            currencyCode: parsed.currencyCode,
          },
        );

        // Note: bankAccountId still required in input for validation but not passed to service

        const text =
          `Balance updated successfully: ${result.balance} ${result.currencyCode} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

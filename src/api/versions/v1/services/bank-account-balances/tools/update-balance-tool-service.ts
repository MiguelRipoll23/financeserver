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
        inputSchema: UpdateBalanceToolSchema.shape,
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
          parsed.bankAccountId,
          parsed.id,
          {
            balance: parsed.balance,
            currencySymbol: parsed.currencySymbol,
            interestRate: parsed.interestRate,
            interestRateStartDate: parsed.interestRateStartDate,
            interestRateEndDate: parsed.interestRateEndDate,
          }
        );

        const text = `Balance updated successfully: ${result.balance} ${result.currencySymbol} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { CreateBankAccountBalanceToolSchema } from "../../../schemas/mcp-bank-account-balances-schemas.ts";

@injectable()
export class AddBalanceToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.add_balance",
      meta: {
        title: "Add bank account balance",
        description:
          "Use this when you need to record a new balance for a bank account. This creates a historical record of the account balance at a specific point in time.",
        inputSchema: CreateBankAccountBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountBalanceToolSchema.parse(input);

        const result = await this.bankAccountsService.createBankAccountBalance({
          bankAccountId: parsed.bankAccountId,
          balance: parsed.balance,
          currencyCode: parsed.currencyCode,
          interestRate: parsed.interestRate,
          interestRateStartDate: parsed.interestRateStartDate,
          interestRateEndDate: parsed.interestRateEndDate,
        });

        const interestInfo = result.interestRate
          ? ` with ${result.interestRate}% interest rate`
          : "";

        const text = `Balance recorded successfully: ${result.balance} ${result.currencyCode}${interestInfo} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

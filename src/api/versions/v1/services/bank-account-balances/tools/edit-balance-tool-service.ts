import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { z } from "zod";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const PercentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const UpdateBalanceSchema = z.object({
  id: z.number().int().positive().describe("ID of the balance record to update"),
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  balance: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe("The updated balance (format: 123.45, no currency symbol)"),
  currencySymbol: z
    .string()
    .length(3)
    .optional()
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  interestRate: z
    .string()
    .regex(PercentageRegex)
    .optional()
    .describe("Interest rate percentage (format: 2.50 for 2.50%, optional)"),
  interestRateStartDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe("Start date of interest rate period (format: YYYY-MM-DD, optional)"),
  interestRateEndDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe("End date of interest rate period (format: YYYY-MM-DD, optional)"),
});

@injectable()
export class EditBalanceToolService {
  constructor(
    private bankAccountsService = inject(BankAccountsService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.edit_balance",
      meta: {
        title: "Edit bank account balance",
        description:
          "Use this when you need to update an existing balance record. Do not use for adding or deleting balances.",
        inputSchema: UpdateBalanceSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBalanceSchema.parse(input);

        const result = await this.bankAccountsService.updateBankAccountBalance(
          {
            id: parsed.id,
            bankAccountId: parsed.bankAccountId,
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

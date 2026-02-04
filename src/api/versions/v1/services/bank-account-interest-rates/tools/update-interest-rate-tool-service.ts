import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountInterestRatesService } from "../../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { UpdateBankAccountInterestRateToolSchema } from "../../../schemas/mcp-bank-account-interest-rates-schemas.ts";

@injectable()
export class UpdateInterestRateToolService {
  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService
    )
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.update_interest_rate",
      meta: {
        title: "Update bank account interest rate",
        description:
          "Use this when you need to update an existing interest rate record for a bank account (e.g. correct a date or rate).",
        inputSchema: UpdateBankAccountInterestRateToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBankAccountInterestRateToolSchema.parse(input);

        const result =
          await this.bankAccountInterestRatesService.updateBankAccountInterestRate(
            parsed.id,
            {
              interestRate: parsed.interestRate,
              taxPercentage: parsed.taxPercentage,
              interestRateStartDate: parsed.interestRateStartDate,
              interestRateEndDate: parsed.interestRateEndDate,
            }
          );

        const text = `Interest rate updated successfully: ${result.interestRate}% from ${result.interestRateStartDate}${result.interestRateEndDate ? ` to ${result.interestRateEndDate}` : ""} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountInterestRatesService } from "../../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { CreateBankAccountInterestRateToolSchema } from "../../../schemas/mcp-bank-account-interest-rates-schemas.ts";

@injectable()
export class CreateInterestRateToolService {
  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService
    )
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.add_interest_rate",
      meta: {
        title: "Add bank account interest rate",
        description:
          "Use this when you need to record a new interest rate for a bank account. This creates a historical record of the interest rate period.",
        inputSchema: CreateBankAccountInterestRateToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountInterestRateToolSchema.parse(input);

        const result =
          await this.bankAccountInterestRatesService.createBankAccountInterestRate(
            {
              bankAccountId: parsed.bankAccountId,
              interestRate: parsed.interestRate,
              interestRateStartDate: parsed.interestRateStartDate,
              interestRateEndDate: parsed.interestRateEndDate,
            }
          );

        const text = `Interest rate recorded successfully: ${result.interestRate}% from ${result.interestRateStartDate}${result.interestRateEndDate ? ` to ${result.interestRateEndDate}` : ""} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

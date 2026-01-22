import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountInterestRatesService } from "../../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { FilterBankAccountInterestRatesToolSchema } from "../../../schemas/mcp-bank-account-interest-rates-schemas.ts";

@injectable()
export class FilterInterestRatesToolService {
  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService
    )
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.list_interest_rates",
      meta: {
        title: "List bank account interest rates",
        description:
          "Use this when you need to view the history of interest rates for a bank account.",
        inputSchema: FilterBankAccountInterestRatesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBankAccountInterestRatesToolSchema.parse(input);

        const result =
          await this.bankAccountInterestRatesService.getBankAccountInterestRates({
            bankAccountId: parsed.bankAccountId,
            sortOrder: parsed.sortOrder,
            limit: parsed.pageSize,
            cursor: parsed.cursor,
          });

        const count = result.results.length;
        const ratesList = result.results
          .map(
            (rate) =>
              `- ${rate.interestRate}% from ${rate.interestRateStartDate}${rate.interestRateEndDate ? ` to ${rate.interestRateEndDate}` : " (ongoing)"} (ID: ${rate.id})`
          )
          .join("\n");

        let text = `Found ${count} interest rate record${count !== 1 ? "s" : ""}`;
        if (count > 0) {
          text += `:\n${ratesList}`;
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

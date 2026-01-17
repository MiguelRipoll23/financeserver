import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountInterestRatesService } from "../../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { DeleteInterestRateToolSchema } from "../../../schemas/mcp-bank-account-interest-rates-schemas.ts";

@injectable()
export class DeleteInterestRateToolService {
  constructor(
    private bankAccountInterestRatesService = inject(
      BankAccountInterestRatesService
    )
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.delete_interest_rate",
      meta: {
        title: "Delete bank account interest rate",
        description:
          "Use this when you need to delete an existing interest rate record.",
        inputSchema: DeleteInterestRateToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteInterestRateToolSchema.parse(input);

        await this.bankAccountInterestRatesService.deleteBankAccountInterestRate(
          parsed.id
        );

        return {
          text: `Interest rate deleted successfully (ID: ${parsed.id})`,
        };
      },
    };
  }
}

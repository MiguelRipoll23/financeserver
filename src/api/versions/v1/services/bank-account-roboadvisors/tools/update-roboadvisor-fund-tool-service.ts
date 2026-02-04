import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { UpdateBankAccountRoboadvisorFundToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-funds-schemas.ts";

@injectable()
export class UpdateRoboadvisorFundToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.funds.update",
      meta: {
        title: "Update roboadvisor fund allocation",
        description:
          "Use this when you need to update an existing fund allocation in a roboadvisor. This includes changing the weight, ISIN, or other fund details",
        inputSchema: UpdateBankAccountRoboadvisorFundToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBankAccountRoboadvisorFundToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.updateBankAccountRoboadvisorFund(
            parsed.id,
            {
              name: parsed.name,
              isin: parsed.isin,
              assetClass: parsed.assetClass,
              region: parsed.region,
              fundCurrencyCode: parsed.fundCurrencyCode,
              weight: parsed.weight,
              shareCount: parsed.shareCount,
            },
          );

        const weightPercentage = (result.weight * 100).toFixed(2);
        // Treat 0 as a valid share count by checking for null/undefined explicitly
        const shareInfo = result.shareCount != null ? ` with ${result.shareCount} shares` : '';
        const text = `Fund allocation updated successfully: ${result.name} (${result.isin}) - ${weightPercentage}% allocation${shareInfo} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { UpdateBankAccountRoboadvisorToolSchema } from "../../../schemas/mcp-bank-account-roboadvisors-schemas.ts";

@injectable()
export class UpdateRoboadvisorToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.update",
      meta: {
        title: "Update roboadvisor",
        description:
          "Use this when you need to update an existing roboadvisor portfolio configuration. This includes modifying fees, risk level, or other settings",
        inputSchema: UpdateBankAccountRoboadvisorToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBankAccountRoboadvisorToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.updateBankAccountRoboadvisor(
            parsed.id,
            {
              name: parsed.name,
              riskLevel: parsed.riskLevel,
              managementFeePercentage: parsed.managementFeePercentage,
              custodyFeePercentage: parsed.custodyFeePercentage,
              fundTerPercentage: parsed.fundTerPercentage,
              totalFeePercentage: parsed.totalFeePercentage,
              managementFeeFrequency: parsed.managementFeeFrequency,
              custodyFeeFrequency: parsed.custodyFeeFrequency,
              terPricedInNav: parsed.terPricedInNav,
            },
          );

        const feePct = (parseFloat(result.totalFeePercentage) * 100).toFixed(2);
        const text = `Roboadvisor portfolio updated successfully: ${result.name} (ID: ${result.id}, Total Fee: ${feePct}%)`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

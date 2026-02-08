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
      name: "roboadvisors.update",
      meta: {
        title: "Update roboadvisor",
        description:
          "Use this when you need to update an existing roboadvisor configuration. This includes modifying fees, risk level, or other settings",
        inputSchema: UpdateBankAccountRoboadvisorToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBankAccountRoboadvisorToolSchema.parse(input);

        const result = await this.roboadvisorsService
          .updateBankAccountRoboadvisor(
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
              taxPercentage: parsed.taxPercentage,
            },
          );

        // Use a non-abbreviated variable name to comply with project naming rules
        const feePercentage = (result.totalFeePercentage * 100).toFixed(2);
        const text =
          `Roboadvisor updated successfully: ${result.name} (ID: ${result.id}, Total Fee: ${feePercentage}%)`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

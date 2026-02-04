import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { CreateBankAccountRoboadvisorToolSchema } from "../../../schemas/mcp-bank-account-roboadvisors-schemas.ts";

@injectable()
export class CreateRoboadvisorToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.create",
      meta: {
        title: "Create roboadvisor",
        description:
          "Use this when you need to create a new roboadvisor for automated investment management. This includes configuring fees, risk level, and linking it to a bank account.",
        inputSchema: CreateBankAccountRoboadvisorToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountRoboadvisorToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.createBankAccountRoboadvisor({
            name: parsed.name,
            bankAccountId: parsed.bankAccountId,
            riskLevel: parsed.riskLevel,
            managementFeePercentage: parsed.managementFeePercentage,
            custodyFeePercentage: parsed.custodyFeePercentage,
            fundTerPercentage: parsed.fundTerPercentage,
            totalFeePercentage: parsed.totalFeePercentage,
            managementFeeFrequency: parsed.managementFeeFrequency,
            custodyFeeFrequency: parsed.custodyFeeFrequency,
            terPricedInNav: parsed.terPricedInNav ?? true,
            capitalGainsTaxPercentage: parsed.capitalGainsTaxPercentage,
          });

        const text = `Roboadvisor created successfully: ${result.name} (ID: ${result.id}, Total Fee: ${(parseFloat(result.totalFeePercentage) * 100).toFixed(2)}%)`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

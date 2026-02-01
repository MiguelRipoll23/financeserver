import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { CreateBankAccountRoboadvisorFundToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-funds-schemas.ts";

@injectable()
export class CreateRoboadvisorFundToolService {
  constructor(private roboadvisorsService = inject(BankAccountRoboadvisorsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.funds.create",
      meta: {
        title: "Create roboadvisor fund allocation",
        description:
          "Use this when you need to add a fund allocation to a roboadvisor portfolio. This defines which ETFs or mutual funds the portfolio invests in and their target weights.",
        inputSchema: CreateBankAccountRoboadvisorFundToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountRoboadvisorFundToolSchema.parse(input);

        const result = await this.roboadvisorsService.createBankAccountRoboadvisorFund({
          bankAccountRoboadvisorId: parsed.bankAccountRoboadvisorId,
          name: parsed.name,
          isin: parsed.isin,
          assetClass: parsed.assetClass,
          region: parsed.region,
          fundCurrencyCode: parsed.fundCurrencyCode,
          weight: parsed.weight,
        });

        const weightPct = (parseFloat(result.weight) * 100).toFixed(2);
        const text = `Fund allocation created successfully: ${result.name} (${result.isin}) - ${weightPct}% allocation (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

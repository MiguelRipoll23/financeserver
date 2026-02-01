import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { CreateBankAccountRoboadvisorBalanceToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-balances-schemas.ts";

@injectable()
export class CreateRoboadvisorBalanceToolService {
  constructor(private roboadvisorsService = inject(BankAccountRoboadvisorsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.balances.create",
      meta: {
        title: "Create roboadvisor balance entry",
        description:
          "Use this when you need to record a deposit, withdrawal, or adjustment for a roboadvisor. This tracks the roboadvisor's cash movements over time.",
        inputSchema: CreateBankAccountRoboadvisorBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountRoboadvisorBalanceToolSchema.parse(input);

        const result = await this.roboadvisorsService.createBankAccountRoboadvisorBalance({
          bankAccountRoboadvisorId: parsed.bankAccountRoboadvisorId,
          date: parsed.date,
          type: parsed.type,
          amount: parsed.amount,
          currencyCode: parsed.currencyCode,
        });

        const text = `Balance entry recorded successfully: ${result.type} of ${result.amount} ${result.currencyCode} on ${result.date} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

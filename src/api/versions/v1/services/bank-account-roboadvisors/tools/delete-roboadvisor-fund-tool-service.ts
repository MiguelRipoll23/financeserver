import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { DeleteBankAccountRoboadvisorFundToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-funds-schemas.ts";

@injectable()
export class DeleteRoboadvisorFundToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.roboadvisors.funds.delete",
      meta: {
        title: "Delete roboadvisor fund allocation",
        description:
          "Use this when you need to permanently remove a fund allocation from a roboadvisor portfolio",
        inputSchema: DeleteBankAccountRoboadvisorFundToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBankAccountRoboadvisorFundToolSchema.parse(input);

        await this.roboadvisorsService.deleteBankAccountRoboadvisorFund(
          parsed.id,
        );

        const text = `Fund allocation with ID ${parsed.id} has been deleted successfully`;

        return {
          text,
          structured: { success: true, id: parsed.id },
        };
      },
    };
  }
}

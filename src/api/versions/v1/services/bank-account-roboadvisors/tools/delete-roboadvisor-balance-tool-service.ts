import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { DeleteBankAccountRoboadvisorBalanceToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-balances-schemas.ts";

@injectable()
export class DeleteRoboadvisorBalanceToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "roboadvisors.balances.delete",
      meta: {
        title: "Delete roboadvisor balance entry",
        description:
          "Use this when you need to permanently delete a balance entry from a roboadvisor. This action cannot be undone.",
        inputSchema: DeleteBankAccountRoboadvisorBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBankAccountRoboadvisorBalanceToolSchema.parse(
          input,
        );

        await this.roboadvisorsService.deleteBankAccountRoboadvisorBalance(
          parsed.id,
        );

        const text =
          `Balance entry with ID ${parsed.id} has been deleted successfully`;

        return {
          text,
          structured: { success: true, id: parsed.id },
        };
      },
    };
  }
}

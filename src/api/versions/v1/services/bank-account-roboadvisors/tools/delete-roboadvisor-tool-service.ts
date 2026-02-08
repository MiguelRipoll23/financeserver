import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { DeleteBankAccountRoboadvisorToolSchema } from "../../../schemas/mcp-bank-account-roboadvisors-schemas.ts";

@injectable()
export class DeleteRoboadvisorToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "roboadvisors.delete",
      meta: {
        title: "Delete roboadvisor",
        description:
          "Use this when you need to permanently delete a roboadvisor and all its associated data (balances, funds). This action cannot be undone",
        inputSchema: DeleteBankAccountRoboadvisorToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBankAccountRoboadvisorToolSchema.parse(input);

        await this.roboadvisorsService.deleteBankAccountRoboadvisor(parsed.id);

        const text =
          `Roboadvisor with ID ${parsed.id} has been deleted successfully`;

        return {
          text,
          structured: { success: true, id: parsed.id },
        };
      },
    };
  }
}

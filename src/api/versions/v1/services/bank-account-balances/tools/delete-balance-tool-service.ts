import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { DeleteBalanceToolSchema } from "../../../schemas/mcp-bank-account-balances-schemas.ts";

@injectable()
export class DeleteBalanceToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.delete_balance",
      meta: {
        title: "Delete bank account balance",
        description:
          "Use this when you need to permanently delete a balance record. Do not use for adding or editing balances.",
        inputSchema: DeleteBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBalanceToolSchema.parse(input);

        await this.bankAccountsService.deleteBankAccountBalance(parsed.id);

        // Note: bankAccountId still required in input for validation context but not passed to service

        const text =
          `Balance with ID ${parsed.id} has been deleted successfully`;

        return {
          text,
          structured: { success: true, id: parsed.id },
        };
      },
    };
  }
}

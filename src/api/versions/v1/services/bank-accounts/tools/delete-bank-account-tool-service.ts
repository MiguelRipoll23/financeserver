import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../bank-accounts-service.ts";
import { DeleteBankAccountToolSchema } from "../../../schemas/mcp-bank-accounts-schemas.ts";

@injectable()
export class DeleteBankAccountToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.delete",
      meta: {
        title: "Delete bank account",
        description:
          "Use this when you need to permanently delete a bank account. Do not use for creating or updating bank accounts. Warning: This will also delete all associated balances.",
        inputSchema: DeleteBankAccountToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBankAccountToolSchema.parse(input);

        await this.bankAccountsService.deleteBankAccount(parsed.id);

        const text = `Bank account with ID ${parsed.id} deleted successfully`;

        return {
          text,
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../../bank-accounts/bank-accounts-service.ts";
import { z } from "zod";

const DeleteBalanceSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the balance record to delete"),
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
});

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
        inputSchema: DeleteBalanceSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBalanceSchema.parse(input);

        await this.bankAccountsService.deleteBankAccountBalance({
          id: parsed.id,
          bankAccountId: parsed.bankAccountId,
        });

        const text = `Balance with ID ${parsed.id} has been deleted successfully`;

        return {
          text,
          structured: { success: true, id: parsed.id },
        };
      },
    };
  }
}

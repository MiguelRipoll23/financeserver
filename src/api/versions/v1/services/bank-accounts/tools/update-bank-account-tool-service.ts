import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../bank-accounts-service.ts";
import { UpdateBankAccountToolSchema } from "../../../schemas/mcp-bank-accounts-schemas.ts";

@injectable()
export class UpdateBankAccountToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.update",
      meta: {
        title: "Update bank account",
        description:
          "Use this when you need to update an existing bank account's details. Do not use for creating or deleting bank accounts.",
        inputSchema: UpdateBankAccountToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBankAccountToolSchema.parse(input);

        const result = await this.bankAccountsService.updateBankAccount(
          parsed.id,
          {
            name: parsed.name,
            type: parsed.type,
            taxPercentage: parsed.taxPercentage,
          }
        );

        const text = `Bank account updated successfully: ${result.name} (${result.type}) (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

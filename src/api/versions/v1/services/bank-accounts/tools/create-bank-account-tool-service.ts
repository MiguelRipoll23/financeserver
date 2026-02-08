import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountsService } from "../bank-accounts-service.ts";
import { CreateBankAccountToolSchema } from "../../../schemas/mcp-bank-accounts-schemas.ts";

@injectable()
export class CreateBankAccountToolService {
  constructor(private bankAccountsService = inject(BankAccountsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bank_accounts.create",
      meta: {
        title: "Create bank account",
        description:
          "Use this when you need to create a new bank account. Do not use for updating or deleting bank accounts.",
        inputSchema: CreateBankAccountToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateBankAccountToolSchema.parse(input);

        const result = await this.bankAccountsService.createBankAccount({
          name: parsed.name,
          type: parsed.type,
          taxPercentage: parsed.taxPercentage,
        });

        const text = `Bank account created successfully: ${result.name} (${result.type}) (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

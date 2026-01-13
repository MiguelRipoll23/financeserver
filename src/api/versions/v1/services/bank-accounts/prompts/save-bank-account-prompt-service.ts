import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const SaveBankAccountPromptSchema = z.object({
  name: z.string().min(1).max(255).describe("The name of the bank account"),
  confirmationMessage: z.string().min(1).max(512).optional(),
});

type SaveBankAccountPromptInput = z.infer<typeof SaveBankAccountPromptSchema>;

@injectable()
export class SaveBankAccountPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "save_bank_account_confirmation",
      meta: {
        title: "Save bank account with confirmation",
        description:
          "Create a bank account and provide a confirmation summary with the saved details",
        argsSchema: SaveBankAccountPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = SaveBankAccountPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const confirmationMessage = parsed.confirmationMessage?.trim().length
          ? parsed.confirmationMessage.trim()
          : "Confirm that the bank account has been created successfully and provide a summary of the account details.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the bank_accounts.create tool with the following input:",
                  jsonPayload,
                  "",
                  `After creating the bank account, ${confirmationMessage}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: SaveBankAccountPromptInput
  ): Record<string, unknown> {
    return {
      name: input.name,
    };
  }
}

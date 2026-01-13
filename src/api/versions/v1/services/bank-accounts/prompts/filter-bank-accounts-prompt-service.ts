import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const FilterBankAccountsPromptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  summaryRequest: z.string().min(1).max(512).optional(),
});

type FilterBankAccountsPromptInput = z.infer<
  typeof FilterBankAccountsPromptSchema
>;

@injectable()
export class FilterBankAccountsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_bank_accounts_summary",
      meta: {
        title: "Filter bank accounts and provide summary",
        description:
          "Filter bank accounts by optional name and provide a summary of the results",
        argsSchema: FilterBankAccountsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterBankAccountsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const summaryRequest = parsed.summaryRequest?.trim().length
          ? parsed.summaryRequest.trim()
          : "Provide a summary of the bank accounts found, including their names and IDs.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the bank_accounts.filter tool with the following input:",
                  jsonPayload,
                  "",
                  `After filtering the bank accounts, ${summaryRequest}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: FilterBankAccountsPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.name) {
      payload.name = input.name;
    }

    return payload;
  }
}

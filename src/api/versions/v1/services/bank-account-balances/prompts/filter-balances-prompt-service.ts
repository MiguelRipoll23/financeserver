import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const FilterBalancesPromptSchema = z.object({
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  summaryRequest: z.string().min(1).max(512).optional(),
});

type FilterBalancesPromptInput = z.infer<typeof FilterBalancesPromptSchema>;

@injectable()
export class FilterBalancesPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_balances_summary",
      meta: {
        title: "Filter bank account balances and provide summary",
        description:
          "Filter balances for a specific bank account and provide a summary of the results",
        argsSchema: FilterBalancesPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterBalancesPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const summaryRequest = parsed.summaryRequest?.trim().length
          ? parsed.summaryRequest.trim()
          : "Provide a summary of the balances found, including the amounts, currency, and dates.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the bank_accounts.filter_balances tool with the following input:",
                  jsonPayload,
                  "",
                  `After filtering the balances, ${summaryRequest}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: FilterBalancesPromptInput): Record<string, unknown> {
    return {
      bankAccountId: input.bankAccountId,
    };
  }
}

import { injectable } from "@needle-di/core";
import { z } from "zod";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const FilterMerchantsPromptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  summaryRequest: z.string().min(1).max(512).optional(),
});

type FilterMerchantsPromptInput = z.infer<typeof FilterMerchantsPromptSchema>;

@injectable()
export class FilterMerchantsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_merchants_summary",
      meta: {
        title: "Filter merchants and provide summary",
        description:
          "Filter merchants by optional name and provide a summary of the results",
        argsSchema: FilterMerchantsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterMerchantsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const summaryRequest = parsed.summaryRequest?.trim().length
          ? parsed.summaryRequest.trim()
          : "Provide a summary of the merchants found, including their names and IDs.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the filter_merchants tool with the following input:",
                  jsonPayload,
                  "",
                  `After filtering the merchants, ${summaryRequest}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: FilterMerchantsPromptInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.name) {
      payload.name = input.name;
    }

    return payload;
  }
}

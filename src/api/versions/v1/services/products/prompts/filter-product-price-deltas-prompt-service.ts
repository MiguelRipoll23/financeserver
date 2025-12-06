import { injectable } from "@needle-di/core";
import { z } from "zod";
import { SortOrder } from "../../../enums/sort-order-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const FilterProductPriceDeltasPromptSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort_order: z.nativeEnum(SortOrder).optional(),
  limit: z.number().int().gte(1).max(100).optional(),
  cursor: z.string().optional(),
  highlightFocus: z.string().min(1).max(512).optional(),
});

type FilterProductPriceDeltasPromptInput = z.infer<
  typeof FilterProductPriceDeltasPromptSchema
>;

@injectable()
export class FilterProductPriceDeltasPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_product_price_deltas_summary",
      meta: {
        title: "Filter product price deltas",
        description:
          "Retrieve product price delta rankings and call out the strongest risers, steepest fallers, and context.",
        argsSchema: FilterProductPriceDeltasPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterProductPriceDeltasPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const focus = parsed.highlightFocus?.trim().length
          ? parsed.highlightFocus.trim()
          : "Summarise the strongest and weakest price movements and provide any context you can infer.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Call the filter_product_price_deltas tool with the following input:",
                  jsonPayload,
                  "",
                  `Once the tool responds, ${focus}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: FilterProductPriceDeltasPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.start_date) {
      payload.start_date = input.start_date;
    }

    if (input.end_date) {
      payload.end_date = input.end_date;
    }

    if (input.sort_order) {
      payload.sort_order = input.sort_order;
    }

    if (input.limit !== undefined) {
      payload.limit = input.limit;
    }

    if (input.cursor) {
      payload.cursor = input.cursor;
    }

    return payload;
  }
}

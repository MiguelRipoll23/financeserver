import { injectable } from "@needle-di/core";
import { z } from "zod";
import { ReceiptSortField } from "../../../enums/receipt-sort-field-enum.ts";
import { SortOrder } from "../../../enums/sort-order-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const FilterReceiptsPromptSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  min_total_amount: z.string().regex(MonetaryRegex).optional(),
  max_total_amount: z.string().regex(MonetaryRegex).optional(),
  product_name: z.string().min(1).max(256).optional(),
  sort_field: z.nativeEnum(ReceiptSortField).optional(),
  sort_order: z.nativeEnum(SortOrder).optional(),
  limit: z.number().int().gte(1).max(100).optional(),
  cursor: z.string().optional(),
  summaryFocus: z.string().min(1).max(512).optional(),
});

type FilterReceiptsPromptInput = z.infer<typeof FilterReceiptsPromptSchema>;

@injectable()
export class FilterReceiptsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_receipts_summary",
      meta: {
        title: "Filter receipts and summarise",
        description:
          "Fetch targeted receipts and digest per-receipt totals, notable items, and spending patterns.",
        argsSchema: FilterReceiptsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterReceiptsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const focus = parsed.summaryFocus?.trim().length
          ? parsed.summaryFocus.trim()
          : "Summarise the receipts, calling out totals per receipt and any notable products.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Invoke the filter_receipts tool with the following input:",
                  jsonPayload,
                  "",
                  `After the tool call, ${focus}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: FilterReceiptsPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.start_date) {
      payload.start_date = input.start_date;
    }

    if (input.end_date) {
      payload.end_date = input.end_date;
    }

    if (input.min_total_amount) {
      payload.min_total_amount = input.min_total_amount;
    }

    if (input.max_total_amount) {
      payload.max_total_amount = input.max_total_amount;
    }

    if (input.product_name) {
      payload.product_name = input.product_name;
    }

    if (input.sort_field) {
      payload.sort_field = input.sort_field;
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

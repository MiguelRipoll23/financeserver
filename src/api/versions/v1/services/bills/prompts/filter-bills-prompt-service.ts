import { injectable } from "@needle-di/core";
import { z } from "zod";
import { BillSortField } from "../../../enums/bill-sort-field-enum.ts";
import { SortOrder } from "../../../enums/sort-order-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const FilterBillsPromptSchema = z.object({
  startDate: z.string().regex(DateOnlyRegex).optional(),
  endDate: z.string().regex(DateOnlyRegex).optional(),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe(
      "Bill category (in english), e.g., 'electricity', 'water', 'internet'"
    )
    .optional(),
  minimumTotalAmount: z.string().regex(MonetaryRegex).optional(),
  maximumTotalAmount: z.string().regex(MonetaryRegex).optional(),
  sortField: z.nativeEnum(BillSortField).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  limit: z.number().int().gte(1).max(100).optional(),
  cursor: z.string().optional(),
  summaryFocus: z.string().min(1).max(512).optional(),
});

type FilterBillsPromptInput = z.infer<typeof FilterBillsPromptSchema>;

@injectable()
export class FilterBillsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_bills_summary",
      meta: {
        title: "Filter bills and summarise",
        description:
          "Run the bill filter, then summarise totals, date coverage, and standout category (in english)",
        argsSchema: FilterBillsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterBillsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const summaryFocus = parsed.summaryFocus?.trim().length
          ? parsed.summaryFocus.trim()
          : "Provide a concise summary that highlights totals, date ranges, and any notable categories.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the filter_bills tool with the following input:",
                  jsonPayload,
                  "",
                  `After reviewing the tool response, ${summaryFocus}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(input: FilterBillsPromptInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.startDate) {
      payload.startDate = input.startDate;
    }

    if (input.endDate) {
      payload.endDate = input.endDate;
    }

    if (input.category) {
      payload.category = input.category;
    }

    if (input.minimumTotalAmount) {
      payload.minimumTotalAmount = input.minimumTotalAmount;
    }

    if (input.maximumTotalAmount) {
      payload.maximumTotalAmount = input.maximumTotalAmount;
    }

    if (input.sortField) {
      payload.sortField = input.sortField;
    }

    if (input.sortOrder) {
      payload.sortOrder = input.sortOrder;
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

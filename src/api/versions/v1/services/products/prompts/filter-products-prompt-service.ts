import { injectable } from "@needle-di/core";
import { z } from "zod";
import { ProductSortField } from "../../../enums/product-sort-field-enum.ts";
import { SortOrder } from "../../../enums/sort-order-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const FilterProductsPromptSchema = z.object({
  query: z.string().min(1).max(256).optional(),
  min_unit_price: z.string().regex(MonetaryRegex).optional(),
  max_unit_price: z.string().regex(MonetaryRegex).optional(),
  sort_field: z.nativeEnum(ProductSortField).optional(),
  sort_order: z.nativeEnum(SortOrder).optional(),
  limit: z.number().int().gte(1).max(100).optional(),
  cursor: z.string().optional(),
  insightFocus: z.string().min(1).max(512).optional(),
});

type FilterProductsPromptInput = z.infer<typeof FilterProductsPromptSchema>;

@injectable()
export class FilterProductsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_products_summary",
      meta: {
        title: "Filter products and summarise",
        description:
          "Call the product filter tool, then spotlight price bands, outliers, and naming trends.",
        argsSchema: FilterProductsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterProductsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const focus = parsed.insightFocus?.trim().length
          ? parsed.insightFocus.trim()
          : "Summarise the product list, calling out extremes in unit price and any naming patterns.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Call the filter_products tool with the following input:",
                  jsonPayload,
                  "",
                  `After the tool completes, ${focus}`,
                ].join("\n"),
              },
            },
          ],
        } satisfies McpPromptRunResult;
      },
    } satisfies McpPromptDefinition;
  }

  private buildPayload(
    input: FilterProductsPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.query) {
      payload.query = input.query;
    }

    if (input.min_unit_price) {
      payload.min_unit_price = input.min_unit_price;
    }

    if (input.max_unit_price) {
      payload.max_unit_price = input.max_unit_price;
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

import { injectable } from "@needle-di/core";
import { z } from "zod";
import { SubscriptionSortField } from "../../../enums/subscription-sort-field-enum.ts";
import { SortOrder } from "../../../enums/sort-order-enum.ts";
import { Recurrence } from "../../../enums/recurrence-enum.ts";
import {
  McpPromptDefinition,
  McpPromptRunResult,
} from "../../../interfaces/mcp/mcp-prompt-interface.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const FilterSubscriptionsPromptSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe(
      "Subscription name or partial name to search for, e.g., 'Netflix', 'Spotify'"
    )
    .optional(),
  category: z
    .string()
    .min(1)
    .max(128)
    .describe(
      "Subscription category (in english), e.g., 'Entertainment', 'Software', 'Utilities'"
    )
    .optional(),
  recurrence: z.nativeEnum(Recurrence).optional(),
  minimumAmount: z.string().regex(MonetaryRegex).optional(),
  maximumAmount: z.string().regex(MonetaryRegex).optional(),
  startDate: z.string().regex(DateOnlyRegex).optional(),
  endDate: z.string().regex(DateOnlyRegex).optional(),
  isActive: z.boolean().optional(),
  currencyCode: z
    .string()
    .length(3)
    .describe("Currency code filter, e.g., 'EUR', 'USD', 'GBP'")
    .optional(),
  sortField: z.nativeEnum(SubscriptionSortField).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  limit: z.number().int().gte(1).max(100).optional(),
  cursor: z.string().optional(),
  summaryFocus: z.string().min(1).max(512).optional(),
});

type FilterSubscriptionsPromptInput = z.infer<
  typeof FilterSubscriptionsPromptSchema
>;

@injectable()
export class FilterSubscriptionsPromptService {
  public getDefinition(): McpPromptDefinition {
    return {
      name: "filter_subscriptions_summary",
      meta: {
        title: "Filter subscriptions and summarise",
        description:
          "Run the subscription filter, then summarise active subscriptions, recurring costs, and notable categories (in english)",
        argsSchema: FilterSubscriptionsPromptSchema.shape,
      },
      run: (input: unknown): McpPromptRunResult => {
        const parsed = FilterSubscriptionsPromptSchema.parse(input);
        const payload = this.buildPayload(parsed);
        const summaryFocus = parsed.summaryFocus?.trim().length
          ? parsed.summaryFocus.trim()
          : "Provide a concise summary that highlights active subscriptions, total recurring costs, billing frequencies, and any notable categories or spending patterns.";

        const jsonPayload = JSON.stringify(payload, null, 2);

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Use the filter_subscriptions tool with the following input:",
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

  private buildPayload(
    input: FilterSubscriptionsPromptInput
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.name) {
      payload.name = input.name;
    }

    if (input.category) {
      payload.category = input.category;
    }

    if (input.recurrence) {
      payload.recurrence = input.recurrence;
    }

    if (input.minimumAmount) {
      payload.minimumAmount = input.minimumAmount;
    }

    if (input.maximumAmount) {
      payload.maximumAmount = input.maximumAmount;
    }

    if (input.startDate) {
      payload.startDate = input.startDate;
    }

    if (input.endDate) {
      payload.endDate = input.endDate;
    }

    if (input.isActive !== undefined) {
      payload.isActive = input.isActive;
    }

    if (input.currencyCode) {
      payload.currencyCode = input.currencyCode;
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

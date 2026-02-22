import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SubscriptionsService } from "../subscriptions-service.ts";
import { FilterSubscriptionsToolSchema } from "../../../schemas/mcp-subscriptions-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class FilterSubscriptionsToolService {
  constructor(private subscriptionsService = inject(SubscriptionsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "subscriptions.filter",
      meta: {
        title: "Filter subscriptions",
        description:
          "Use this when you need to search subscriptions by name, category, recurrence, date range, and active status.",
        inputSchema: FilterSubscriptionsToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterSubscriptionsToolSchema.parse(input);

        const result = await this.subscriptionsService.getSubscriptions({
          cursor: parsed.cursor,
          limit: parsed.limit,
          name: parsed.name,
          category: parsed.category,
          recurrence: parsed.recurrence,
          minimumAmount: parsed.minimumAmount,
          maximumAmount: parsed.maximumAmount,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          isActive: parsed.isActive,
          currencyCode: parsed.currencyCode,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        let text = "";

        if (result.results.length === 0) {
          text = "No subscriptions matched the provided filters.";
        } else {
          const subscriptionsList = result.results
            .map((subscription) => {
              const startDate = subscription.effectiveFrom.split("T")[0];
              const endDate = subscription.effectiveUntil
                ? ` (ends: ${subscription.effectiveUntil.split("T")[0]})`
                : " (active)";
              const planInfo = subscription.plan
                ? ` - ${subscription.plan}`
                : "";
              return `• ${subscription.name}${planInfo} – ${subscription.category} (${
                getCurrencySymbolForCode(
                  subscription.currencyCode,
                )
              }${subscription.amount}/${subscription.recurrence}, started: ${startDate}${endDate})`;
            })
            .join("\n");

          let text = subscriptionsList;
          if (result.nextCursor) {
            text +=
              `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
          }

          return {
            text,
            structured: result,
          };
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

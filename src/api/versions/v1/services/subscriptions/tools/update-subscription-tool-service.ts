import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SubscriptionsService } from "../subscriptions-service.ts";
import { UpdateSubscriptionToolSchema } from "../../../schemas/mcp-subscriptions-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class UpdateSubscriptionToolService {
  constructor(private subscriptionsService = inject(SubscriptionsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "subscriptions.update",
      meta: {
        title: "Update subscription",
        description:
          "Use this when you need to update an existing subscription with new details. Do not use for creating new subscriptions, canceling subscriptions, or deleting subscriptions.",
        inputSchema: UpdateSubscriptionToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateSubscriptionToolSchema.parse(input);

        const result = await this.subscriptionsService.updateSubscription(
          parsed.subscriptionId,
          {
            name: parsed.name,
            category: parsed.category,
            recurrence: parsed.recurrence,
            amount: parsed.amount,
            currencyCode: parsed.currencyCode,
            effectiveFrom: parsed.effectiveFrom,
            effectiveUntil: parsed.effectiveUntil,
            plan: parsed.plan,
          }
        );

        const displayStartDate = result.effectiveFrom.split("T")[0];
        const endDateDisplay = result.effectiveUntil
          ? ` (ends: ${result.effectiveUntil.split("T")[0]})`
          : " (active)";

        const planInfo = result.plan ? ` - ${result.plan}` : "";
        const text = `Subscription updated successfully: ${
          result.name
        }${planInfo} – ${result.category} (${getCurrencySymbolForCode(
          result.currencyCode
        )}${result.amount}/${
          result.recurrence
        }, started: ${displayStartDate}${endDateDisplay}) (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

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
          "Use this when you need to update an existing subscription or cancel it.",
        inputSchema: UpdateSubscriptionToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateSubscriptionToolSchema.parse(input);

        // Check if this is a cancellation operation (only effectiveUntil provided)
        const isCancellation =
          parsed.effectiveUntil !== undefined &&
          !parsed.name &&
          !parsed.category &&
          !parsed.amount &&
          !parsed.currencyCode &&
          !parsed.recurrence &&
          !parsed.effectiveFrom &&
          parsed.plan === undefined;

        const result = await this.subscriptionsService.updateSubscription(
          parsed.id,
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
        const displayEndDate = result.effectiveUntil?.split("T")[0];

        if (isCancellation) {
          const planInfo = result.plan ? ` - ${result.plan}` : "";
          const text = `Subscription canceled successfully: ${
            result.name
          }${planInfo} – ${result.category} (${getCurrencySymbolForCode(
            result.currencyCode
          )}${result.amount}/${
            result.recurrence
          }, started: ${displayStartDate}, ended: ${displayEndDate}) (ID: ${
            result.id
          })`;

          return {
            text,
            structured: result,
          };
        } else {
          const endDateDisplay = displayEndDate
            ? ` (ends: ${displayEndDate})`
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
        }
      },
    };
  }
}

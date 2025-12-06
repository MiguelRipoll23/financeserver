import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SubscriptionsService } from "../subscriptions-service.ts";
import { SaveSubscriptionToolSchema } from "../../../schemas/mcp-subscriptions-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class SaveSubscriptionToolService {
  constructor(private subscriptionsService = inject(SubscriptionsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "subscriptions.save",
      meta: {
        title: "Save subscription",
        description:
          "Use this when you need to save a new subscription or update an existing one (including canceling by setting an end date).",
        inputSchema: SaveSubscriptionToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveSubscriptionToolSchema.parse(input);

        let result;

        if (parsed.subscriptionId && parsed.effectiveUntil) {
          // Update existing subscription with end date (canceling)
          result = await this.subscriptionsService.saveSubscriptionEndDate(
            parsed.subscriptionId,
            parsed.effectiveUntil
          );

          const displayStartDate = result.effectiveFrom.split("T")[0];
          const displayEndDate = result.effectiveUntil!.split("T")[0];

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
          // Create new subscription
          result = await this.subscriptionsService.createSubscription({
            name: parsed.name,
            category: parsed.category,
            recurrence: parsed.recurrence,
            amount: parsed.amount,
            currencyCode: parsed.currencyCode,
            effectiveFrom: parsed.effectiveFrom,
            effectiveUntil: parsed.effectiveUntil,
            plan: parsed.plan,
          });

          const displayStartDate = result.effectiveFrom.split("T")[0];
          const endDateDisplay = result.effectiveUntil
            ? ` (ends: ${result.effectiveUntil.split("T")[0]})`
            : " (active)";

          const planInfo = result.plan ? ` - ${result.plan}` : "";
          const text = `Subscription saved successfully: ${
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

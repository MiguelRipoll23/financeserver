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
        description: "Use this when you need to save a new subscription.",
        inputSchema: SaveSubscriptionToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveSubscriptionToolSchema.parse(input);

        const result = await this.subscriptionsService.createSubscription({
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
        const text =
          `Subscription saved successfully: ${result.name}${planInfo} – ${result.category} (${
            getCurrencySymbolForCode(
              result.currencyCode,
            )
          }${result.amount}/${result.recurrence}, started: ${displayStartDate}${endDateDisplay}) (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

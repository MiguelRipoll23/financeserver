import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SubscriptionsService } from "../subscriptions-service.ts";
import { DeleteSubscriptionToolSchema } from "../../../schemas/mcp-subscriptions-schemas.ts";

@injectable()
export class DeleteSubscriptionToolService {
  constructor(private subscriptionsService = inject(SubscriptionsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "subscriptions.delete",
      meta: {
        title: "Delete subscription",
        description:
          "Use this when you need to delete a subscription that contains completely invalid data. Do not use for updating or correcting subscriptions - use subscriptions.update instead.",
        inputSchema: DeleteSubscriptionToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteSubscriptionToolSchema.parse(input);

        await this.subscriptionsService.deleteSubscription(
          parsed.subscriptionId
        );

        const text = `Subscription deleted successfully (ID: ${parsed.subscriptionId})`;

        return {
          text,
          structured: { id: parsed.subscriptionId, deleted: true },
        };
      },
    };
  }
}

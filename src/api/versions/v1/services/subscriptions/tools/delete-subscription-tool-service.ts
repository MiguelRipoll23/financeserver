import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SubscriptionsService } from "../subscriptions-service.ts";
import { DeleteSubscriptionToolSchema } from "../../../schemas/mcp-subscriptions-schemas.ts";
import { ServerError } from "../../../models/server-error.ts";

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
        inputSchema: DeleteSubscriptionToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteSubscriptionToolSchema.parse(input);

        try {
          await this.subscriptionsService.deleteSubscription(parsed.id);
        } catch (error) {
          if (
            error instanceof ServerError &&
            error.getCode() === "SUBSCRIPTION_NOT_FOUND"
          ) {
            // If the subscription is already deleted, we can consider it a success for idempotency.
          } else {
            throw error; // Re-throw other errors
          }
        }

        const text = `Subscription deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

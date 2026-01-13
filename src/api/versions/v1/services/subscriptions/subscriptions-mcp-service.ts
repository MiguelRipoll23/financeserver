import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { FilterSubscriptionsToolService } from "./tools/filter-subscriptions-tool-service.ts";
import { SaveSubscriptionToolService } from "./tools/save-subscription-tool-service.ts";
import { UpdateSubscriptionToolService } from "./tools/update-subscription-tool-service.ts";
import { DeleteSubscriptionToolService } from "./tools/delete-subscription-tool-service.ts";

@injectable()
export class SubscriptionsMCPService {
  constructor(
    private filterSubscriptionsToolService = inject(
      FilterSubscriptionsToolService
    ),
    private saveSubscriptionToolService = inject(SaveSubscriptionToolService),
    private updateSubscriptionToolService = inject(
      UpdateSubscriptionToolService
    ),
    private deleteSubscriptionToolService = inject(
      DeleteSubscriptionToolService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterSubscriptionsToolService.getDefinition(),
      this.saveSubscriptionToolService.getDefinition(),
      this.updateSubscriptionToolService.getDefinition(),
      this.deleteSubscriptionToolService.getDefinition(),
    ];
  }
}

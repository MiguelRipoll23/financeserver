import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";
import { FilterSubscriptionsToolService } from "./tools/filter-subscriptions-tool-service.ts";
import { SaveSubscriptionToolService } from "./tools/save-subscription-tool-service.ts";
import { UpdateSubscriptionToolService } from "./tools/update-subscription-tool-service.ts";
import { DeleteSubscriptionToolService } from "./tools/delete-subscription-tool-service.ts";
import { FilterSubscriptionsPromptService } from "./prompts/filter-subscriptions-prompt-service.ts";
import { SaveSubscriptionPromptService } from "./prompts/save-subscription-prompt-service.ts";

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
    ),
    private filterSubscriptionsPromptService = inject(
      FilterSubscriptionsPromptService
    ),
    private saveSubscriptionPromptService = inject(
      SaveSubscriptionPromptService
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

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.filterSubscriptionsPromptService.getDefinition(),
      this.saveSubscriptionPromptService.getDefinition(),
    ];
  }
}

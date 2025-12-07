import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";
import { FilterBillsToolService } from "./tools/filter-bills-tool-service.ts";
import { SaveBillToolService } from "./tools/save-bill-tool-service.ts";
import { UpdateBillToolService } from "./tools/update-bill-tool-service.ts";
import { FilterBillsPromptService } from "./prompts/filter-bills-prompt-service.ts";
import { SaveBillPromptService } from "./prompts/save-bill-prompt-service.ts";

@injectable()
export class BillsMCPService {
  constructor(
    private filterBillsToolService = inject(FilterBillsToolService),
    private saveBillToolService = inject(SaveBillToolService),
    private updateBillToolService = inject(UpdateBillToolService),
    private filterBillsPromptService = inject(FilterBillsPromptService),
    private saveBillPromptService = inject(SaveBillPromptService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterBillsToolService.getDefinition(),
      this.saveBillToolService.getDefinition(),
      this.updateBillToolService.getDefinition(),
    ];
  }

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.filterBillsPromptService.getDefinition(),
      this.saveBillPromptService.getDefinition(),
    ];
  }
}

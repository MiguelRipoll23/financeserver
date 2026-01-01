import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";
import { FilterMerchantsToolService } from "./tools/filter-merchants-tool-service.ts";
import { SaveMerchantToolService } from "./tools/save-merchant-tool-service.ts";
import { UpdateMerchantToolService } from "./tools/update-merchant-tool-service.ts";
import { DeleteMerchantToolService } from "./tools/delete-merchant-tool-service.ts";
import { FilterMerchantsPromptService } from "./prompts/filter-merchants-prompt-service.ts";
import { SaveMerchantPromptService } from "./prompts/save-merchant-prompt-service.ts";

@injectable()
export class MerchantsMCPService {
  constructor(
    private filterMerchantsToolService = inject(FilterMerchantsToolService),
    private saveMerchantToolService = inject(SaveMerchantToolService),
    private updateMerchantToolService = inject(UpdateMerchantToolService),
    private deleteMerchantToolService = inject(DeleteMerchantToolService),
    private filterMerchantsPromptService = inject(FilterMerchantsPromptService),
    private saveMerchantPromptService = inject(SaveMerchantPromptService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterMerchantsToolService.getDefinition(),
      this.saveMerchantToolService.getDefinition(),
      this.updateMerchantToolService.getDefinition(),
      this.deleteMerchantToolService.getDefinition(),
    ];
  }

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.filterMerchantsPromptService.getDefinition(),
      this.saveMerchantPromptService.getDefinition(),
    ];
  }
}

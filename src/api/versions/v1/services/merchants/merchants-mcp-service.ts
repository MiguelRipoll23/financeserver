import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { FilterMerchantsToolService } from "./tools/filter-merchants-tool-service.ts";
import { SaveMerchantToolService } from "./tools/save-merchant-tool-service.ts";
import { UpdateMerchantToolService } from "./tools/update-merchant-tool-service.ts";
import { DeleteMerchantToolService } from "./tools/delete-merchant-tool-service.ts";

@injectable()
export class MerchantsMCPService {
  constructor(
    private filterMerchantsToolService = inject(FilterMerchantsToolService),
    private saveMerchantToolService = inject(SaveMerchantToolService),
    private updateMerchantToolService = inject(UpdateMerchantToolService),
    private deleteMerchantToolService = inject(DeleteMerchantToolService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterMerchantsToolService.getDefinition(),
      this.saveMerchantToolService.getDefinition(),
      this.updateMerchantToolService.getDefinition(),
      this.deleteMerchantToolService.getDefinition(),
    ];
  }
}

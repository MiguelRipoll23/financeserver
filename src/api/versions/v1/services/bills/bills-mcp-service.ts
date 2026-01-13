import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { FilterBillsToolService } from "./tools/filter-bills-tool-service.ts";
import { SaveBillToolService } from "./tools/save-bill-tool-service.ts";
import { UpdateBillToolService } from "./tools/update-bill-tool-service.ts";
import { DeleteBillToolService } from "./tools/delete-bill-tool-service.ts";

@injectable()
export class BillsMCPService {
  constructor(
    private filterBillsToolService = inject(FilterBillsToolService),
    private saveBillToolService = inject(SaveBillToolService),
    private updateBillToolService = inject(UpdateBillToolService),
    private deleteBillToolService = inject(DeleteBillToolService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterBillsToolService.getDefinition(),
      this.saveBillToolService.getDefinition(),
      this.updateBillToolService.getDefinition(),
      this.deleteBillToolService.getDefinition(),
    ];
  }
}

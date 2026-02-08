import { inject, injectable } from "@needle-di/core";
import { FilterReceiptsToolService } from "./tools/filter-receipts-tool-service.ts";
import { SaveReceiptToolService } from "./tools/save-receipt-tool-service.ts";
import { UpdateReceiptToolService } from "./tools/update-receipt-tool-service.ts";
import { DeleteReceiptToolService } from "./tools/delete-receipt-tool-service.ts";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";

@injectable()
export class ReceiptsMCPService {
  constructor(
    private filterReceiptsToolService = inject(FilterReceiptsToolService),
    private saveReceiptToolService = inject(SaveReceiptToolService),
    private updateReceiptToolService = inject(UpdateReceiptToolService),
    private deleteReceiptToolService = inject(DeleteReceiptToolService),
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterReceiptsToolService.getDefinition(),
      this.saveReceiptToolService.getDefinition(),
      this.updateReceiptToolService.getDefinition(),
      this.deleteReceiptToolService.getDefinition(),
    ];
  }
}

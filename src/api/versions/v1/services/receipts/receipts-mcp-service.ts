import { inject, injectable } from "@needle-di/core";
import { FilterReceiptsToolService } from "./tools/filter-receipts-tool-service.ts";
import { SaveReceiptToolService } from "./tools/save-receipt-tool-service.ts";
import { UpdateReceiptToolService } from "./tools/update-receipt-tool-service.ts";
import { FilterReceiptsPromptService } from "./prompts/filter-receipts-prompt-service.ts";
import { SaveReceiptPromptService } from "./prompts/save-receipt-prompt-service.ts";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";

@injectable()
export class ReceiptsMCPService {
  constructor(
    private filterReceiptsToolService = inject(FilterReceiptsToolService),
    private saveReceiptToolService = inject(SaveReceiptToolService),
    private updateReceiptToolService = inject(UpdateReceiptToolService),
    private filterReceiptsPromptService = inject(FilterReceiptsPromptService),
    private saveReceiptPromptService = inject(SaveReceiptPromptService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterReceiptsToolService.getDefinition(),
      this.saveReceiptToolService.getDefinition(),
      this.updateReceiptToolService.getDefinition(),
    ];
  }

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.filterReceiptsPromptService.getDefinition(),
      this.saveReceiptPromptService.getDefinition(),
    ];
  }
}

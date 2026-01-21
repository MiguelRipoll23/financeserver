import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateCashToolService } from "./tools/create-cash-tool-service.ts";
import { UpdateCashToolService } from "./tools/update-cash-tool-service.ts";
import { DeleteCashToolService } from "./tools/delete-cash-tool-service.ts";
import { FilterCashToolService } from "./tools/filter-cash-tool-service.ts";

@injectable()
export class CashMCPService {
  constructor(
    private createCashToolService = inject(CreateCashToolService),
    private updateCashToolService = inject(UpdateCashToolService),
    private deleteCashToolService = inject(DeleteCashToolService),
    private filterCashToolService = inject(FilterCashToolService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterCashToolService.getDefinition(),
      this.createCashToolService.getDefinition(),
      this.updateCashToolService.getDefinition(),
      this.deleteCashToolService.getDefinition(),
    ];
  }
}

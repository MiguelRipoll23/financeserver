import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateBalanceToolService } from "./tools/create-balance-tool-service.ts";
import { UpdateBalanceToolService } from "./tools/update-balance-tool-service.ts";
import { DeleteBalanceToolService } from "./tools/delete-balance-tool-service.ts";
import { FilterBalancesToolService } from "./tools/filter-balances-tool-service.ts";

@injectable()
export class BankAccountBalancesMCPService {
  constructor(
    private createBalanceToolService = inject(CreateBalanceToolService),
    private updateBalanceToolService = inject(UpdateBalanceToolService),
    private deleteBalanceToolService = inject(DeleteBalanceToolService),
    private filterBalancesToolService = inject(FilterBalancesToolService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createBalanceToolService.getDefinition(),
      this.updateBalanceToolService.getDefinition(),
      this.deleteBalanceToolService.getDefinition(),
      this.filterBalancesToolService.getDefinition(),
    ];
  }
}

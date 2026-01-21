import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateCashBalanceToolService } from "./tools/create-cash-balance-tool-service.ts";
import { UpdateCashBalanceToolService } from "./tools/update-cash-balance-tool-service.ts";
import { DeleteCashBalanceToolService } from "./tools/delete-cash-balance-tool-service.ts";
import { FilterCashBalancesToolService } from "./tools/filter-cash-balances-tool-service.ts";

@injectable()
export class CashBalancesMCPService {
  constructor(
    private createCashBalanceToolService = inject(CreateCashBalanceToolService),
    private updateCashBalanceToolService = inject(UpdateCashBalanceToolService),
    private deleteCashBalanceToolService = inject(DeleteCashBalanceToolService),
    private filterCashBalancesToolService = inject(
      FilterCashBalancesToolService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterCashBalancesToolService.getDefinition(),
      this.createCashBalanceToolService.getDefinition(),
      this.updateCashBalanceToolService.getDefinition(),
      this.deleteCashBalanceToolService.getDefinition(),
    ];
  }
}

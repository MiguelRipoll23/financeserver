import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { AddBalanceToolService } from "./tools/add-balance-tool-service.ts";
import { UpdateBalanceToolService } from "./tools/update-balance-tool-service.ts";
import { DeleteBalanceToolService } from "./tools/delete-balance-tool-service.ts";
import { FilterBalancesToolService } from "./tools/filter-balances-tool-service.ts";

@injectable()
export class BankAccountBalancesMCPService {
  constructor(
    private addBalanceToolService = inject(AddBalanceToolService),
    private updateBalanceToolService = inject(UpdateBalanceToolService),
    private deleteBalanceToolService = inject(DeleteBalanceToolService),
    private filterBalancesToolService = inject(FilterBalancesToolService)
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.addBalanceToolService.getDefinition(),
      this.updateBalanceToolService.getDefinition(),
      this.deleteBalanceToolService.getDefinition(),
      this.filterBalancesToolService.getDefinition(),
    ];
  }
}

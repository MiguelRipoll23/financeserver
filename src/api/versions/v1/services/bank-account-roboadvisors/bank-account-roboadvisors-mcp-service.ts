import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateRoboadvisorToolService } from "./tools/create-roboadvisor-tool-service.ts";
import { UpdateRoboadvisorToolService } from "./tools/update-roboadvisor-tool-service.ts";
import { DeleteRoboadvisorToolService } from "./tools/delete-roboadvisor-tool-service.ts";
import { FilterRoboadvisorsToolService } from "./tools/filter-roboadvisors-tool-service.ts";
import { CreateRoboadvisorBalanceToolService } from "./tools/create-roboadvisor-balance-tool-service.ts";
import { UpdateRoboadvisorBalanceToolService } from "./tools/update-roboadvisor-balance-tool-service.ts";
import { DeleteRoboadvisorBalanceToolService } from "./tools/delete-roboadvisor-balance-tool-service.ts";
import { FilterRoboadvisorBalancesToolService } from "./tools/filter-roboadvisor-balances-tool-service.ts";
import { CreateRoboadvisorFundToolService } from "./tools/create-roboadvisor-fund-tool-service.ts";
import { UpdateRoboadvisorFundToolService } from "./tools/update-roboadvisor-fund-tool-service.ts";
import { DeleteRoboadvisorFundToolService } from "./tools/delete-roboadvisor-fund-tool-service.ts";
import { FilterRoboadvisorFundsToolService } from "./tools/filter-roboadvisor-funds-tool-service.ts";

@injectable()
export class BankAccountRoboadvisorsMCPService {
  constructor(
    private createRoboadvisorToolService = inject(CreateRoboadvisorToolService),
    private updateRoboadvisorToolService = inject(UpdateRoboadvisorToolService),
    private deleteRoboadvisorToolService = inject(DeleteRoboadvisorToolService),
    private filterRoboadvisorsToolService = inject(
      FilterRoboadvisorsToolService,
    ),
    private createRoboadvisorBalanceToolService = inject(
      CreateRoboadvisorBalanceToolService,
    ),
    private updateRoboadvisorBalanceToolService = inject(
      UpdateRoboadvisorBalanceToolService,
    ),
    private deleteRoboadvisorBalanceToolService = inject(
      DeleteRoboadvisorBalanceToolService,
    ),
    private filterRoboadvisorBalancesToolService = inject(
      FilterRoboadvisorBalancesToolService,
    ),
    private createRoboadvisorFundToolService = inject(
      CreateRoboadvisorFundToolService,
    ),
    private updateRoboadvisorFundToolService = inject(
      UpdateRoboadvisorFundToolService,
    ),
    private deleteRoboadvisorFundToolService = inject(
      DeleteRoboadvisorFundToolService,
    ),
    private filterRoboadvisorFundsToolService = inject(
      FilterRoboadvisorFundsToolService,
    ),
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createRoboadvisorToolService.getDefinition(),
      this.updateRoboadvisorToolService.getDefinition(),
      this.deleteRoboadvisorToolService.getDefinition(),
      this.filterRoboadvisorsToolService.getDefinition(),
      this.createRoboadvisorBalanceToolService.getDefinition(),
      this.updateRoboadvisorBalanceToolService.getDefinition(),
      this.deleteRoboadvisorBalanceToolService.getDefinition(),
      this.filterRoboadvisorBalancesToolService.getDefinition(),
      this.createRoboadvisorFundToolService.getDefinition(),
      this.updateRoboadvisorFundToolService.getDefinition(),
      this.deleteRoboadvisorFundToolService.getDefinition(),
      this.filterRoboadvisorFundsToolService.getDefinition(),
    ];
  }
}

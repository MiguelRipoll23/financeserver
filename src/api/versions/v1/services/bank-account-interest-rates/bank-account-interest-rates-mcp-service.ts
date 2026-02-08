import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateInterestRateToolService } from "./tools/create-interest-rate-tool-service.ts";
import { UpdateInterestRateToolService } from "./tools/update-interest-rate-tool-service.ts";
import { DeleteInterestRateToolService } from "./tools/delete-interest-rate-tool-service.ts";
import { FilterInterestRatesToolService } from "./tools/filter-interest-rates-tool-service.ts";

@injectable()
export class BankAccountInterestRatesMCPService {
  constructor(
    private createInterestRateToolService = inject(
      CreateInterestRateToolService,
    ),
    private updateInterestRateToolService = inject(
      UpdateInterestRateToolService,
    ),
    private deleteInterestRateToolService = inject(
      DeleteInterestRateToolService,
    ),
    private filterInterestRatesToolService = inject(
      FilterInterestRatesToolService,
    ),
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createInterestRateToolService.getDefinition(),
      this.updateInterestRateToolService.getDefinition(),
      this.deleteInterestRateToolService.getDefinition(),
      this.filterInterestRatesToolService.getDefinition(),
    ];
  }
}

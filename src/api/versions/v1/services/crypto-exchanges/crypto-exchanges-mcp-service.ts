import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateCryptoExchangeToolService } from "./tools/create-crypto-exchange-tool-service.ts";
import { UpdateCryptoExchangeToolService } from "./tools/update-crypto-exchange-tool-service.ts";
import { DeleteCryptoExchangeToolService } from "./tools/delete-crypto-exchange-tool-service.ts";
import { FilterCryptoExchangesToolService } from "./tools/filter-crypto-exchanges-tool-service.ts";
import { CreateCryptoExchangeBalanceToolService } from "./tools/create-crypto-exchange-balance-tool-service.ts";
import { UpdateCryptoExchangeBalanceToolService } from "./tools/update-crypto-exchange-balance-tool-service.ts";
import { DeleteCryptoExchangeBalanceToolService } from "./tools/delete-crypto-exchange-balance-tool-service.ts";
import { FilterCryptoExchangeBalancesToolService } from "./tools/filter-crypto-exchange-balances-tool-service.ts";

@injectable()
export class CryptoExchangesMCPService {
  constructor(
    private createCryptoExchangeToolService = inject(
      CreateCryptoExchangeToolService
    ),
    private updateCryptoExchangeToolService = inject(
      UpdateCryptoExchangeToolService
    ),
    private deleteCryptoExchangeToolService = inject(
      DeleteCryptoExchangeToolService
    ),
    private filterCryptoExchangesToolService = inject(
      FilterCryptoExchangesToolService
    ),
    private createCryptoExchangeBalanceToolService = inject(
      CreateCryptoExchangeBalanceToolService
    ),
    private updateCryptoExchangeBalanceToolService = inject(
      UpdateCryptoExchangeBalanceToolService
    ),
    private deleteCryptoExchangeBalanceToolService = inject(
      DeleteCryptoExchangeBalanceToolService
    ),
    private filterCryptoExchangeBalancesToolService = inject(
      FilterCryptoExchangeBalancesToolService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createCryptoExchangeToolService.getDefinition(),
      this.updateCryptoExchangeToolService.getDefinition(),
      this.deleteCryptoExchangeToolService.getDefinition(),
      this.filterCryptoExchangesToolService.getDefinition(),
      this.createCryptoExchangeBalanceToolService.getDefinition(),
      this.updateCryptoExchangeBalanceToolService.getDefinition(),
      this.deleteCryptoExchangeBalanceToolService.getDefinition(),
      this.filterCryptoExchangeBalancesToolService.getDefinition(),
    ];
  }
}

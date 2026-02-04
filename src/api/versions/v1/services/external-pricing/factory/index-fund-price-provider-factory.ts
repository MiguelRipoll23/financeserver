import { inject, injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";
import { YahooFinanceAdapter } from "../adapters/yahoo-finance-adapter.ts";

@injectable()
export class IndexFundPriceProviderFactory {
  constructor(private yahooFinanceAdapter = inject(YahooFinanceAdapter)) {}

  public getProvider(): IndexFundPriceProvider {
    // For now, always return Yahoo Finance adapter
    // In the future, this could be configurable via environment variable
    return this.yahooFinanceAdapter;
  }
}

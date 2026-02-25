import { inject, injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";
import { FinnhubAdapter } from "../adapters/finnhub-adapter.ts";

@injectable()
export class IndexFundPriceProviderFactory {
  constructor(private finnhubAdapter = inject(FinnhubAdapter)) {}

  public getProvider(): IndexFundPriceProvider {
    return this.finnhubAdapter;
  }
}

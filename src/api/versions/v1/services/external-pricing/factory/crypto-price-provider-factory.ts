import { inject, injectable } from "@needle-di/core";
import { CryptoPriceProvider } from "../interfaces/crypto-price-provider-interface.ts";
import { CoingeckoAdapter } from "../adapters/coingecko-adapter.ts";

@injectable()
export class CryptoPriceProviderFactory {
  constructor(private coingeckoAdapter = inject(CoingeckoAdapter)) {}

  public getProvider(): CryptoPriceProvider {
    // For now, always return CoinGecko adapter
    // In the future, this could be configurable via environment variable
    return this.coingeckoAdapter;
  }
}

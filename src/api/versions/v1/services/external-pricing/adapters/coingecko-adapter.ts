import { injectable } from "@needle-di/core";
import { CryptoPriceProvider } from "../interfaces/crypto-price-provider-interface.ts";

/**
 * CoinGecko crypto price provider
 * Uses free API without authentication
 * Rate limited to ~50 calls/min
 */
@injectable()
export class CoingeckoAdapter implements CryptoPriceProvider {
  private readonly baseUrl = "https://api.coingecko.com/api/v3";

  // Map common symbols to CoinGecko IDs
  private readonly symbolToIdMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binancecoin",
    USDC: "usd-coin",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    SOL: "solana",
    MATIC: "matic-network",
    DOT: "polkadot",
    LTC: "litecoin",
    SHIB: "shiba-inu",
    TRX: "tron",
    AVAX: "avalanche-2",
    UNI: "uniswap",
    LINK: "chainlink",
    ATOM: "cosmos",
    XLM: "stellar",
    BCH: "bitcoin-cash",
  };

  public async getCurrentPrice(
    symbolCode: string,
    targetCurrencyCode: string
  ): Promise<string | null> {
    try {
      const coinId =
        this.symbolToIdMap[symbolCode.toUpperCase()] ||
        symbolCode.toLowerCase();
      const currency = targetCurrencyCode.toLowerCase();

      const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${currency}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();

      if (!data[coinId] || !data[coinId][currency]) {
        console.error(
          `No price found for ${symbolCode} in ${targetCurrencyCode}`
        );
        return null;
      }

      const price = data[coinId][currency];
      return price.toString();
    } catch (error) {
      console.error(`Error fetching crypto price from CoinGecko:`, error);
      return null;
    }
  }
}

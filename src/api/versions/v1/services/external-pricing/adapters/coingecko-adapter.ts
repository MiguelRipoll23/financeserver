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
    targetCurrencyCode: string,
  ): Promise<string | null> {
    try {
      const coinId = this.symbolToIdMap[symbolCode.toUpperCase()] ||
        symbolCode.toLowerCase();
      const currency = targetCurrencyCode.toLowerCase();

      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: currency,
      });
      const url = `${this.baseUrl}/simple/price?${params}`;

      const priceRequestStartedAt = Date.now();
      console.info(
        `CoingeckoAdapter: Starting price request for symbol ${symbolCode}, coin id ${coinId}, target currency ${targetCurrencyCode}`,
      );

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      const priceRequestDurationMilliseconds = Date.now() -
        priceRequestStartedAt;

      if (!response.ok) {
        console.error(
          `CoingeckoAdapter: Price request failed for symbol ${symbolCode}, coin id ${coinId}, target currency ${targetCurrencyCode} with status ${response.status} ${response.statusText} after ${priceRequestDurationMilliseconds}ms`,
        );
        return null;
      }

      const data = await response.json();

      if (
        !data[coinId] ||
        !(currency in data[coinId]) ||
        data[coinId][currency] === null ||
        data[coinId][currency] === undefined
      ) {
        console.error(
          `CoingeckoAdapter: No price found for symbol ${symbolCode}, coin id ${coinId}, target currency ${targetCurrencyCode}`,
        );
        return null;
      }

      const price = data[coinId][currency];
      console.info(
        `CoingeckoAdapter: Price request succeeded for symbol ${symbolCode}, coin id ${coinId}, target currency ${targetCurrencyCode}, price ${price}, duration ${priceRequestDurationMilliseconds}ms`,
      );
      return price.toString();
    } catch (error) {
      console.error(
        `CoingeckoAdapter: Error fetching crypto price for symbol ${symbolCode}, target currency ${targetCurrencyCode}:`,
        error,
      );
      return null;
    }
  }
}

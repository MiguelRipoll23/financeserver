import { injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";

/**
 * Yahoo Finance index fund price provider
 * Note: This is a simplified implementation
 * For production use, consider using a proper ISIN-to-ticker mapping service
 * like OpenFIGI or a dedicated financial data provider
 */
@injectable()
export class YahooFinanceAdapter implements IndexFundPriceProvider {
  private readonly baseUrl =
    "https://query1.finance.yahoo.com/v8/finance/chart";

  // Simple in-memory cache for ISIN→ticker mappings
  private readonly isinTickerCache = new Map<string, string | null>();

  private isISIN(code: string): boolean {
    return typeof code === "string" && /^[A-Z]{2}[A-Z0-9]{10}$/i.test(code);
  }

  public async getCurrentPrice(
    isinOrTicker: string,
    _targetCurrencyCode: string,
  ): Promise<string | null> {
    try {
      let ticker: string | null = isinOrTicker;

      if (this.isISIN(isinOrTicker)) {
        ticker = await this.convertIsinToTicker(isinOrTicker);
        if (!ticker) {
          console.warn(
            `YahooFinanceAdapter: ISIN-to-ticker mapping failed for ISIN: ${isinOrTicker}`,
          );
          return null;
        }
      }

      const url = `${this.baseUrl}/${encodeURIComponent(ticker)}?range=1d&interval=1d`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`YahooFinanceAdapter: Yahoo fetch failed for ${ticker}: ${response.status}`);
        return null;
      }

      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (!result) return null;

      const closes = result?.indicators?.quote?.[0]?.close;
      const price = Array.isArray(closes) && closes.length
        ? closes[closes.length - 1]
        : result?.meta?.regularMarketPrice;

      return price != null ? String(price) : null;
    } catch (error) {
      console.error(
        `Error fetching index fund price from Yahoo Finance:`,
        error,
      );
      return null;
    }
  }

  /**
   * Convert ISIN to ticker using OpenFIGI if API key is provided.
   * Caches results in-memory to reduce external calls.
   */
  private async convertIsinToTicker(isin: string): Promise<string | null> {
    if (this.isinTickerCache.has(isin)) {
      return this.isinTickerCache.get(isin) ?? null;
    }

    const openFigiKey = (typeof Deno !== "undefined" && Deno.env?.get)
      ? Deno.env.get("OPENFIGI_API_KEY")
      : undefined;

    if (!openFigiKey) {
      console.warn(`YahooFinanceAdapter: OPENFIGI_API_KEY not set; cannot convert ISIN: ${isin}`);
      this.isinTickerCache.set(isin, null);
      return null;
    }

    try {
      const resp = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OPENFIGI-APIKEY": openFigiKey,
        },
        body: JSON.stringify([{ idType: "ID_ISIN", idValue: isin }]),
      });

      if (!resp.ok) {
        console.warn(`YahooFinanceAdapter: OpenFIGI lookup failed for ${isin}: ${resp.status}`);
        this.isinTickerCache.set(isin, null);
        return null;
      }

      const data = await resp.json();
      const ticker = data?.[0]?.data?.[0]?.ticker ?? null;

      this.isinTickerCache.set(isin, ticker ?? null);
      return ticker ?? null;
    } catch (err) {
      console.warn(`YahooFinanceAdapter: Error converting ISIN ${isin}:`, err);
      this.isinTickerCache.set(isin, null);
      return null;
    }
  }
}

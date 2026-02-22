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

  // Read OPENFIGI key once at class initialization
  private readonly openFigiKey: string | undefined =
    typeof Deno !== "undefined" && Deno.env?.get
      ? Deno.env.get("OPENFIGI_API_KEY")
      : undefined;

  // Simple LRU-like in-memory cache for ISIN→ticker mappings with a fixed max size
  private readonly isinTickerCache = new Map<string, string>();
  private readonly cacheMaxSize = 1000;

  private isISIN(code: string): boolean {
    if (typeof code !== "string") return false;
    const upper = code.toUpperCase();
    return /^[A-Z]{2}[A-Z0-9]{10}$/.test(upper);
  }

  private isValidTicker(ticker: string): boolean {
    if (typeof ticker !== "string") return false;
    const normalized = ticker.toUpperCase();

    // Quick reject for suspicious substrings that indicate traversal or encoding
    const forbiddenSubstrings = ["..", "/", "\\\\", "\0", "%2E", "%2F", "%5C"];
    for (const sub of forbiddenSubstrings) {
      if (normalized.includes(sub)) return false;
    }

    // Allow letters, digits, dot, hyphen and caret (e.g., BRK.B, BRK-B, ^GSPC)
    return /^[A-Z0-9.\-^]+$/.test(normalized);
  }

  private getCachedTicker(isin: string): string | undefined {
    const value = this.isinTickerCache.get(isin);
    if (value !== undefined) {
      // Promote to most-recently-used by re-inserting
      this.isinTickerCache.delete(isin);
      this.isinTickerCache.set(isin, value);
    }
    return value;
  }

  private setCachedTicker(isin: string, ticker: string): void {
    if (this.isinTickerCache.has(isin)) {
      this.isinTickerCache.delete(isin);
    }
    this.isinTickerCache.set(isin, ticker);
    // Evict oldest entry if over capacity
    if (this.isinTickerCache.size > this.cacheMaxSize) {
      const firstKey = this.isinTickerCache.keys().next().value;
      if (firstKey) this.isinTickerCache.delete(firstKey);
    }
  }

  public async getCurrentPrice(
    isinOrTicker: string,
    _targetCurrencyCode: string,
  ): Promise<string | null> {
    try {
      if (!isinOrTicker || typeof isinOrTicker !== "string") return null;

      let ticker: string | null = null;

      if (this.isISIN(isinOrTicker)) {
        ticker = await this.convertIsinToTicker(isinOrTicker);
        if (!ticker) {
          console.warn(
            `YahooFinanceAdapter: ISIN-to-ticker mapping failed for ISIN: ${isinOrTicker}`,
          );
          return null;
        }
      } else {
        ticker = isinOrTicker;
      }

      const normalizedTicker = ticker.toUpperCase();

      if (!this.isValidTicker(normalizedTicker)) {
        console.warn(
          `YahooFinanceAdapter: Invalid ticker supplied: ${normalizedTicker}`,
        );
        return null;
      }

      const url = `${this.baseUrl}/${
        encodeURIComponent(
          normalizedTicker,
        )
      }?range=1d&interval=1d`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(
          `YahooFinanceAdapter: Yahoo fetch failed for ${normalizedTicker}: ${response.status}`,
        );
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
   * Caches successful mappings in-memory to reduce external calls.
   */
  private async convertIsinToTicker(isin: string): Promise<string | null> {
    const normalizedIsin = isin.toUpperCase();

    const cached = this.getCachedTicker(normalizedIsin);
    if (cached) return cached;

    if (!this.openFigiKey) {
      console.warn(
        `YahooFinanceAdapter: OPENFIGI_API_KEY not set; cannot convert ISIN: ${normalizedIsin}`,
      );
      return null;
    }

    try {
      const response = await fetch("https://api.openfigi.com/v3/mapping", {
        signal: AbortSignal.timeout(10_000),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OPENFIGI-APIKEY": this.openFigiKey,
        },
        body: JSON.stringify([{ idType: "ID_ISIN", idValue: normalizedIsin }]),
      });

      if (!response.ok) {
        console.warn(
          `YahooFinanceAdapter: OpenFIGI lookup failed for ${normalizedIsin}: ${response.status}`,
        );
        return null;
      }

      const data = await response.json();
      const ticker = data?.[0]?.data?.[0]?.ticker ?? null;

      if (ticker) {
        const normalizedTicker = String(ticker).toUpperCase();
        this.setCachedTicker(normalizedIsin, normalizedTicker);
        return normalizedTicker;
      }

      return null;
    } catch (error) {
      console.warn(
        `YahooFinanceAdapter: Error converting ISIN ${normalizedIsin}:`,
        error,
      );
      return null;
    }
  }
}

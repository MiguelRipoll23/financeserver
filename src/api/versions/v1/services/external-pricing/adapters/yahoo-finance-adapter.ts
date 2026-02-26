import { injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";
import { fetchWithExternalRequestDebugLogging } from "../../../utils/external-request-utils.ts";

interface YahooSearchQuote {
  symbol: string;
  quoteType: string;
  longname?: string;
}

@injectable()
export class YahooFinanceAdapter implements IndexFundPriceProvider {
  private readonly searchUrl = "https://query1.finance.yahoo.com/v1/finance/search";
  private readonly chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart";

  private readonly maximumRetryAttempts = 3;
  private readonly retryDelayBaseMs = 2000;

  private readonly isinTickerCache = new Map<string, string>();
  private readonly tickerPriceCache = new Map<string, { price: string; timestamp: number }>();
  private readonly cacheMaxSize = 1000;
  private readonly priceCacheDurationMs = 60_000;

  private lastRequestTime = 0;
  private readonly minRequestIntervalMs = 2000;

  private isISIN(code: string): boolean {
    if (typeof code !== "string") return false;
    const upper = code.toUpperCase();
    return /^[A-Z]{2}[A-Z0-9]{10}$/.test(upper);
  }

  private getCachedPrice(ticker: string): string | null {
    const cached = this.tickerPriceCache.get(ticker.toUpperCase());
    if (cached && Date.now() - cached.timestamp < this.priceCacheDurationMs) {
      return cached.price;
    }
    return null;
  }

  private setCachedPrice(ticker: string, price: string): void {
    this.tickerPriceCache.set(ticker.toUpperCase(), {
      price,
      timestamp: Date.now(),
    });
    if (this.tickerPriceCache.size > this.cacheMaxSize) {
      const firstKey = this.tickerPriceCache.keys().next().value;
      if (firstKey) this.tickerPriceCache.delete(firstKey);
    }
  }

  private getCachedTicker(isin: string): string | undefined {
    const value = this.isinTickerCache.get(isin);
    if (value !== undefined) {
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
    if (this.isinTickerCache.size > this.cacheMaxSize) {
      const firstKey = this.isinTickerCache.keys().next().value;
      if (firstKey) this.isinTickerCache.delete(firstKey);
    }
  }

  private sleep(delayMilliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestIntervalMs) {
      await this.sleep(this.minRequestIntervalMs - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  private async fetchWithRetry(
    requestUrl: string,
  ): Promise<{ responseJson: unknown; status: number } | null> {
    for (let attempt = 0; attempt < this.maximumRetryAttempts; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.retryDelayBaseMs * Math.pow(2, attempt - 1));
      }

      await this.waitForRateLimit();

      try {
        const response = await fetchWithExternalRequestDebugLogging(requestUrl, {
          signal: AbortSignal.timeout(10_000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (response.status === 429) {
          continue;
        }

        if (!response.ok) {
          const body = await response.text();
          console.error(
            `YahooFinanceAdapter: Request failed with status ${response.status}: ${body.slice(0, 500)}`,
          );
          return null;
        }

        const responseJson = await response.json();
        return { responseJson, status: response.status };
      } catch (error) {
        console.error(
          `YahooFinanceAdapter: Network error fetching ${requestUrl}, attempt ${attempt + 1}/${this.maximumRetryAttempts}:`,
          error,
        );
        continue;
      }
    }

    return null;
  }

  public async getCurrentPrice(
    isinOrTicker: string,
    targetCurrencyCode: string,
  ): Promise<string | null> {
    if (!isinOrTicker || typeof isinOrTicker !== "string") return null;

    const normalizedInput = isinOrTicker.toUpperCase();

    if (!this.isISIN(normalizedInput)) {
      const cachedPrice = this.getCachedPrice(normalizedInput);
      if (cachedPrice) return cachedPrice;

      const price = await this.fetchPrice(normalizedInput);
      if (price) {
        this.setCachedPrice(normalizedInput, price);
      }
      return price;
    }

    const cachedTicker = this.getCachedTicker(normalizedInput);
    if (cachedTicker) {
      const cachedPrice = this.getCachedPrice(cachedTicker);
      if (cachedPrice) return cachedPrice;

      const price = await this.fetchPrice(cachedTicker);
      if (price) {
        this.setCachedPrice(cachedTicker, price);
      }
      return price;
    }

    const ticker = await this.searchTickerByIsin(normalizedInput);
    if (!ticker) {
      return null;
    }

    this.setCachedTicker(normalizedInput, ticker);

    const cachedPrice = this.getCachedPrice(ticker);
    if (cachedPrice) return cachedPrice;

    const price = await this.fetchPrice(ticker);
    if (price) {
      this.setCachedPrice(ticker, price);
    }

    return price;
  }

  private async searchTickerByIsin(isin: string): Promise<string | null> {
    try {
      const url = `${this.searchUrl}?q=${encodeURIComponent(isin)}&quotesCount=5`;
      const result = await this.fetchWithRetry(url);

      if (!result) {
        return null;
      }

      const { responseJson, status } = result;
      const searchResponse = responseJson as {
        quotes?: YahooSearchQuote[];
      };

      const quotes = searchResponse.quotes;
      if (!quotes || quotes.length === 0) {
        console.warn(
          `YahooFinanceAdapter: No quotes found for ISIN ${isin}, status: ${status}`,
        );
        return null;
      }

      const mutualFundQuote = quotes.find(
        (quote) =>
          quote.quoteType === "MUTUALFUND" ||
          quote.quoteType === "ETF" ||
          quote.longname?.toLowerCase().includes("vanguard"),
      );

      if (!mutualFundQuote) {
        console.warn(
          `YahooFinanceAdapter: No mutual fund found for ISIN ${isin}, quotes: ${JSON.stringify(quotes.map(quote => ({ symbol: quote.symbol, type: quote.quoteType })))}`,
        );
        return null;
      }

      return mutualFundQuote.symbol;
    } catch (error) {
      console.error(`YahooFinanceAdapter: Error searching ISIN ${isin}:`, error);
      return null;
    }
  }

  private async fetchPrice(ticker: string): Promise<string | null> {
    try {
      const url = `${this.chartUrl}/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const result = await this.fetchWithRetry(url);

      if (!result) {
        console.warn(
          `YahooFinanceAdapter: No result fetching price for ticker ${ticker}`,
        );
        return null;
      }

      const { responseJson, status } = result;
      const chartResponse = responseJson as {
        chart?: {
          result?: Array<{
            meta?: { regularMarketPrice?: number };
            indicators?: { quote?: Array<{ close?: (number | null)[] }> };
          }>;
          error?: { description?: string };
        };
      };

      if (chartResponse.chart?.error) {
        console.warn(
          `YahooFinanceAdapter: Chart error for ticker ${ticker}, status: ${status}, error: ${chartResponse.chart.error.description}`,
        );
        return null;
      }

      const chartResult = chartResponse.chart?.result?.[0];
      if (!chartResult) {
        console.warn(
          `YahooFinanceAdapter: No chart result for ticker ${ticker}, status: ${status}`,
        );
        return null;
      }

      const closes = chartResult.indicators?.quote?.[0]?.close;
      const price = Array.isArray(closes) && closes.length
        ? closes[closes.length - 1]
        : chartResult.meta?.regularMarketPrice;

      if (price == null) {
        console.warn(
          `YahooFinanceAdapter: No valid price for ticker ${ticker}, status: ${status}`,
        );
        return null;
      }

      return String(price);
    } catch (error) {
      console.error(`YahooFinanceAdapter: Error fetching price for ticker ${ticker}:`, error);
      return null;
    }
  }
}

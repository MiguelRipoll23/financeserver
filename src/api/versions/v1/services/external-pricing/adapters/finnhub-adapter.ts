import { injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";

@injectable()
export class FinnhubAdapter implements IndexFundPriceProvider {
  private readonly finnhubBaseUrl = "https://finnhub.io/api/v1";
  private readonly maximumLoggedResponseLength = 2000;

  private readonly finnhubApiKey: string | undefined =
    typeof Deno !== "undefined" && Deno.env?.get
      ? Deno.env.get("FINNHUB_API_KEY")
      : undefined;

  private readonly internationalSecuritiesIdentificationNumberToTickerCache =
    new Map<string, string>();
  private readonly maximumCacheSize = 1000;

  private isInternationalSecuritiesIdentificationNumber(
    code: string,
  ): boolean {
    if (typeof code !== "string") return false;
    const upperCaseCode = code.toUpperCase();
    return /^[A-Z]{2}[A-Z0-9]{10}$/.test(upperCaseCode);
  }

  private isValidTicker(ticker: string): boolean {
    if (typeof ticker !== "string") return false;
    const normalizedTicker = ticker.toUpperCase();

    const forbiddenSubstrings = ["..", "/", "\\", "\0", "%2E", "%2F", "%5C"];
    for (const forbiddenSubstring of forbiddenSubstrings) {
      if (normalizedTicker.includes(forbiddenSubstring)) return false;
    }

    return /^[A-Z0-9.\-^]+$/.test(normalizedTicker);
  }

  private getCachedTicker(
    internationalSecuritiesIdentificationNumber: string,
  ): string | undefined {
    const cachedTicker =
      this.internationalSecuritiesIdentificationNumberToTickerCache.get(
        internationalSecuritiesIdentificationNumber,
      );

    if (cachedTicker !== undefined) {
      this.internationalSecuritiesIdentificationNumberToTickerCache.delete(
        internationalSecuritiesIdentificationNumber,
      );
      this.internationalSecuritiesIdentificationNumberToTickerCache.set(
        internationalSecuritiesIdentificationNumber,
        cachedTicker,
      );
    }

    return cachedTicker;
  }

  private setCachedTicker(
    internationalSecuritiesIdentificationNumber: string,
    ticker: string,
  ): void {
    if (
      this.internationalSecuritiesIdentificationNumberToTickerCache.has(
        internationalSecuritiesIdentificationNumber,
      )
    ) {
      this.internationalSecuritiesIdentificationNumberToTickerCache.delete(
        internationalSecuritiesIdentificationNumber,
      );
    }

    this.internationalSecuritiesIdentificationNumberToTickerCache.set(
      internationalSecuritiesIdentificationNumber,
      ticker,
    );

    if (
      this.internationalSecuritiesIdentificationNumberToTickerCache.size >
        this.maximumCacheSize
    ) {
      const oldestInternationalSecuritiesIdentificationNumber =
        this.internationalSecuritiesIdentificationNumberToTickerCache.keys().next()
          .value;
      if (oldestInternationalSecuritiesIdentificationNumber) {
        this.internationalSecuritiesIdentificationNumberToTickerCache.delete(
          oldestInternationalSecuritiesIdentificationNumber,
        );
      }
    }
  }

  private stringifyResponseForLogging(responseBody: unknown): string {
    try {
      const serializedResponse = JSON.stringify(responseBody);
      if (serializedResponse.length <= this.maximumLoggedResponseLength) {
        return serializedResponse;
      }

      return `${serializedResponse.slice(0, this.maximumLoggedResponseLength)}…`;
    } catch {
      return "<unserializable response body>";
    }
  }

  private extractValidPriceFromQuoteResponse(
    quoteResponse: unknown,
  ): string | null {
    const currentPrice = (quoteResponse as { c?: unknown })?.c;

    if (
      typeof currentPrice === "number" &&
      Number.isFinite(currentPrice) &&
      currentPrice > 0
    ) {
      return String(currentPrice);
    }

    return null;
  }

  private async resolveTickerFromFinnhubSearch(
    normalizedTicker: string,
  ): Promise<string | null> {
    const searchRequestUrl = new URL(`${this.finnhubBaseUrl}/search`);
    searchRequestUrl.searchParams.set("q", normalizedTicker);
    searchRequestUrl.searchParams.set("token", this.finnhubApiKey ?? "");

    const searchRequestStartedAt = Date.now();
    const response = await fetch(searchRequestUrl.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    const searchRequestDurationMilliseconds = Date.now() -
      searchRequestStartedAt;

    if (!response.ok) {
      console.warn(
        `FinnhubAdapter: Search request failed for ticker ${normalizedTicker} with status ${response.status} after ${searchRequestDurationMilliseconds}ms`,
      );
      return null;
    }

    const searchResponse = await response.json();
    console.info(
      `FinnhubAdapter: Search response for ticker ${normalizedTicker}: ${this.stringifyResponseForLogging(searchResponse)}`,
    );

    const searchResults = Array.isArray(
      (searchResponse as { result?: unknown[] })?.result,
    )
      ? (searchResponse as { result: unknown[] }).result
      : [];

    for (const searchResult of searchResults) {
      const symbol = (searchResult as { symbol?: unknown })?.symbol;
      const displaySymbol =
        (searchResult as { displaySymbol?: unknown })?.displaySymbol;

      const normalizedSymbol = typeof symbol === "string"
        ? symbol.toUpperCase()
        : null;
      const normalizedDisplaySymbol = typeof displaySymbol === "string"
        ? displaySymbol.toUpperCase()
        : null;

      if (
        normalizedSymbol === normalizedTicker ||
        normalizedDisplaySymbol === normalizedTicker
      ) {
        return normalizedSymbol ?? normalizedDisplaySymbol;
      }

      if (
        normalizedSymbol?.startsWith(`${normalizedTicker}.`) ||
        normalizedSymbol?.startsWith(`${normalizedTicker}:`) ||
        normalizedDisplaySymbol?.startsWith(`${normalizedTicker}.`) ||
        normalizedDisplaySymbol?.startsWith(`${normalizedTicker}:`)
      ) {
        return normalizedSymbol ?? normalizedDisplaySymbol;
      }
    }

    return null;
  }

  public async getCurrentPrice(
    internationalSecuritiesIdentificationNumberOrTicker: string,
    _targetCurrencyCode: string,
  ): Promise<string | null> {
    try {
      if (
        !internationalSecuritiesIdentificationNumberOrTicker ||
        typeof internationalSecuritiesIdentificationNumberOrTicker !== "string"
      ) {
        return null;
      }

      if (!this.finnhubApiKey) {
        console.warn("FinnhubAdapter: FINNHUB_API_KEY is not configured");
        return null;
      }

      let ticker: string | null = null;

      console.info(
        `FinnhubAdapter: Starting price request for identifier ${internationalSecuritiesIdentificationNumberOrTicker}`,
      );

      if (
        this.isInternationalSecuritiesIdentificationNumber(
          internationalSecuritiesIdentificationNumberOrTicker,
        )
      ) {
        ticker = await this.convertInternationalSecuritiesIdentificationNumberToTicker(
          internationalSecuritiesIdentificationNumberOrTicker,
        );

        if (!ticker) {
          console.warn(
            `FinnhubAdapter: ISIN-to-ticker mapping failed for identifier: ${internationalSecuritiesIdentificationNumberOrTicker}`,
          );
          return null;
        }
      } else {
        ticker = internationalSecuritiesIdentificationNumberOrTicker;
      }

      const normalizedTicker = ticker.toUpperCase();
      if (!this.isValidTicker(normalizedTicker)) {
        console.warn(`FinnhubAdapter: Invalid ticker supplied: ${normalizedTicker}`);
        return null;
      }

      const requestUrl = new URL(`${this.finnhubBaseUrl}/quote`);
      requestUrl.searchParams.set("symbol", normalizedTicker);
      requestUrl.searchParams.set("token", this.finnhubApiKey);

      const quoteRequestStartedAt = Date.now();
      let response = await fetch(requestUrl.toString(), {
        signal: AbortSignal.timeout(10_000),
      });
      let quoteRequestDurationMilliseconds = Date.now() -
        quoteRequestStartedAt;

      if (!response.ok) {
        console.warn(
          `FinnhubAdapter: Quote request failed for ticker ${normalizedTicker} with status ${response.status} after ${quoteRequestDurationMilliseconds}ms`,
        );
        return null;
      }

      let quoteResponse = await response.json();
      console.info(
        `FinnhubAdapter: Quote response for ticker ${normalizedTicker}: ${this.stringifyResponseForLogging(quoteResponse)}`,
      );

      let price = this.extractValidPriceFromQuoteResponse(quoteResponse);

      if (price) {
        console.info(
          `FinnhubAdapter: Price request succeeded for ticker ${normalizedTicker} with price ${price} after ${quoteRequestDurationMilliseconds}ms`,
        );
        return price;
      }

      const alternativeTicker = await this.resolveTickerFromFinnhubSearch(
        normalizedTicker,
      );

      if (alternativeTicker && alternativeTicker !== normalizedTicker) {
        const alternativeRequestUrl = new URL(`${this.finnhubBaseUrl}/quote`);
        alternativeRequestUrl.searchParams.set("symbol", alternativeTicker);
        alternativeRequestUrl.searchParams.set("token", this.finnhubApiKey);

        const alternativeQuoteRequestStartedAt = Date.now();
        response = await fetch(alternativeRequestUrl.toString(), {
          signal: AbortSignal.timeout(10_000),
        });
        quoteRequestDurationMilliseconds = Date.now() -
          alternativeQuoteRequestStartedAt;

        if (!response.ok) {
          console.warn(
            `FinnhubAdapter: Quote retry failed for ticker ${alternativeTicker} with status ${response.status} after ${quoteRequestDurationMilliseconds}ms`,
          );
          return null;
        }

        quoteResponse = await response.json();
        console.info(
          `FinnhubAdapter: Quote response for alternative ticker ${alternativeTicker}: ${this.stringifyResponseForLogging(quoteResponse)}`,
        );

        price = this.extractValidPriceFromQuoteResponse(quoteResponse);
        if (price) {
          console.info(
            `FinnhubAdapter: Price request succeeded for alternative ticker ${alternativeTicker} with price ${price} after ${quoteRequestDurationMilliseconds}ms`,
          );
          return price;
        }
      }

      console.warn(
        `FinnhubAdapter: Quote response did not contain a valid current price for ticker ${normalizedTicker}. Response body: ${this.stringifyResponseForLogging(quoteResponse)}`,
      );
      return null;
    } catch (error) {
      console.error(
        `FinnhubAdapter: Error fetching index fund price for identifier ${internationalSecuritiesIdentificationNumberOrTicker}:`,
        error,
      );
      return null;
    }
  }

  private async convertInternationalSecuritiesIdentificationNumberToTicker(
    internationalSecuritiesIdentificationNumber: string,
  ): Promise<string | null> {
    const normalizedInternationalSecuritiesIdentificationNumber =
      internationalSecuritiesIdentificationNumber.toUpperCase();

    const cachedTicker = this.getCachedTicker(
      normalizedInternationalSecuritiesIdentificationNumber,
    );
    if (cachedTicker) {
      console.info(
        `FinnhubAdapter: Using cached ticker ${cachedTicker} for ISIN ${normalizedInternationalSecuritiesIdentificationNumber}`,
      );
      return cachedTicker;
    }

    try {
      const mappingRequestStartedAt = Date.now();
      console.info(
        `FinnhubAdapter: Starting ISIN to ticker mapping for ISIN ${normalizedInternationalSecuritiesIdentificationNumber}`,
      );

      const response = await fetch("https://api.openfigi.com/v3/mapping", {
        signal: AbortSignal.timeout(10_000),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            idType: "ID_ISIN",
            idValue: normalizedInternationalSecuritiesIdentificationNumber,
          },
        ]),
      });

      const mappingRequestDurationMilliseconds = Date.now() -
        mappingRequestStartedAt;

      if (!response.ok) {
        console.warn(
          `FinnhubAdapter: OpenFIGI lookup failed for ISIN ${normalizedInternationalSecuritiesIdentificationNumber} with status ${response.status} after ${mappingRequestDurationMilliseconds}ms`,
        );
        return null;
      }

      const responseBody = await response.json();
      console.info(
        `FinnhubAdapter: OpenFIGI response for ISIN ${normalizedInternationalSecuritiesIdentificationNumber}: ${this.stringifyResponseForLogging(responseBody)}`,
      );
      const ticker = responseBody?.[0]?.data?.[0]?.ticker ?? null;

      if (ticker) {
        const normalizedTicker = String(ticker).toUpperCase();
        this.setCachedTicker(
          normalizedInternationalSecuritiesIdentificationNumber,
          normalizedTicker,
        );
        console.info(
          `FinnhubAdapter: ISIN mapping succeeded for ISIN ${normalizedInternationalSecuritiesIdentificationNumber}, ticker ${normalizedTicker}, duration ${mappingRequestDurationMilliseconds}ms`,
        );
        return normalizedTicker;
      }

      console.warn(
        `FinnhubAdapter: OpenFIGI lookup returned no ticker for ISIN ${normalizedInternationalSecuritiesIdentificationNumber} after ${mappingRequestDurationMilliseconds}ms`,
      );
      return null;
    } catch (error) {
      console.warn(
        `FinnhubAdapter: Error converting ISIN ${normalizedInternationalSecuritiesIdentificationNumber}:`,
        error,
      );
      return null;
    }
  }
}

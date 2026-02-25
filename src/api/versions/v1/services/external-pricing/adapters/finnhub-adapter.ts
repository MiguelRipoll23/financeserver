import { injectable } from "@needle-di/core";
import { IndexFundPriceProvider } from "../interfaces/index-fund-price-provider-interface.ts";

@injectable()
export class FinnhubAdapter implements IndexFundPriceProvider {
  private readonly finnhubBaseUrl = "https://finnhub.io/api/v1";

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
      const response = await fetch(requestUrl.toString(), {
        signal: AbortSignal.timeout(10_000),
      });
      const quoteRequestDurationMilliseconds = Date.now() -
        quoteRequestStartedAt;

      if (!response.ok) {
        console.warn(
          `FinnhubAdapter: Quote request failed for ticker ${normalizedTicker} with status ${response.status} after ${quoteRequestDurationMilliseconds}ms`,
        );
        return null;
      }

      const quoteResponse = await response.json();
      const currentPrice = quoteResponse?.c;

      if (
        typeof currentPrice === "number" &&
        Number.isFinite(currentPrice) &&
        currentPrice > 0
      ) {
        console.info(
          `FinnhubAdapter: Price request succeeded for ticker ${normalizedTicker} with price ${currentPrice} after ${quoteRequestDurationMilliseconds}ms`,
        );
        return String(currentPrice);
      }

      console.warn(
        `FinnhubAdapter: Quote response did not contain a valid current price for ticker ${normalizedTicker}`,
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

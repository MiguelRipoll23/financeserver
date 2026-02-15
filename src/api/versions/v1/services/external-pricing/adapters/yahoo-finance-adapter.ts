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

  public getCurrentPrice(
    isin: string,
    _targetCurrencyCode: string,
  ): Promise<string | null> {
    try {
      // Note: Yahoo Finance doesn't directly support ISIN lookups
      // In a production environment, you would:
      // 1. Use OpenFIGI API to convert ISIN to ticker symbol
      // 2. Then query Yahoo Finance with the ticker
      // For now, we return null to indicate this needs external ticker mapping

      console.warn(
        `YahooFinanceAdapter: ISIN-to-ticker mapping not implemented. ISIN: ${isin}`,
      );
      console.warn(
        `Please implement ISIN-to-ticker mapping using OpenFIGI or similar service`,
      );

      // Example of how it would work with a ticker:
      // const ticker = await this.convertIsinToTicker(isin);
      // if (!ticker) return null;
      //
      // const url = `${this.baseUrl}/${ticker}`;
      // const response = await fetch(url);
      // ... parse response and return price

      return Promise.resolve(null);
    } catch (error) {
      console.error(
        `Error fetching index fund price from Yahoo Finance:`,
        error,
      );
      return Promise.resolve(null);
    }
  }

  /**
   * Placeholder for ISIN to ticker conversion
   * In production, implement using OpenFIGI API or similar
   */
  private convertIsinToTicker(_isin: string): string | null {
    // TODO: Implement ISIN to ticker conversion
    // Example using OpenFIGI:
    // const response = await fetch('https://api.openfigi.com/v3/mapping', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }])
    // });
    // ... parse response to get ticker
    return null;
  }
}

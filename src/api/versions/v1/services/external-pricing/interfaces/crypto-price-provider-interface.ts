export interface CryptoPriceProvider {
  /**
   * Get current price for a cryptocurrency
   * @param symbolCode - Crypto symbol (BTC, ETH, etc.)
   * @param targetCurrencyCode - Desired currency for the price
   * @returns Price in target currency or null if not found
   */
  getCurrentPrice(
    symbolCode: string,
    targetCurrencyCode: string
  ): Promise<string | null>;
}

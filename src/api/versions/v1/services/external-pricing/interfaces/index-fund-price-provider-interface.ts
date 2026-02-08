export interface IndexFundPriceProvider {
  /**
   * Get current price for an index fund by ISIN
   * @param isin - International Securities Identification Number
   * @param targetCurrencyCode - Desired currency for the price
   * @returns Price in target currency or null if not found
   */
  getCurrentPrice(
    isin: string,
    targetCurrencyCode: string,
  ): Promise<string | null>;
}

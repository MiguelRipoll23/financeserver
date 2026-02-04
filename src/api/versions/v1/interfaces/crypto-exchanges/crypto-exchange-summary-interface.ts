export interface CryptoExchangeSummary {
  id: number;
  name: string;
  capitalGainsTaxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValueAfterTax: string;
    calculatedAt: string;
  } | null;
}

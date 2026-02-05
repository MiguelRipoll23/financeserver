export interface CryptoExchangeSummary {
  id: number;
  name: string;
  capitalGainsTaxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValue: string;
    currencyCode: string;
    calculatedAt: string;
  } | null;
}

export interface CryptoExchangeSummary {
  id: number;
  name: string;
  taxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValue: string;
    currencyCode: string;
    calculatedAt: string;
  } | null;
}

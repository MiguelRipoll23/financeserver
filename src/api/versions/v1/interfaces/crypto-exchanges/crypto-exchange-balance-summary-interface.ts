export interface CryptoExchangeBalanceSummary {
  id: number;
  cryptoExchangeId: number;
  balance: string;
  symbolCode: string;
  investedAmount: string | null;
  investedCurrencyCode: string | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValueAfterTax: string;
    calculatedAt: string;
  } | null;
}


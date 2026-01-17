export interface CryptoExchangeBalanceMetric {
  balanceId: number;
  balance: string;
  cryptoExchangeName: string;
  symbolCode: string;
  investedAmount: string | null;
  investedCurrencyCode: string | null;
}

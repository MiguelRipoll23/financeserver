export interface BankAccountBalanceMetric {
  balanceId: number;
  balance: string;
  bankAccountName: string;
  currencyCode: string;
  interestRate: string | null;
}

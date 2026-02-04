export interface BankAccountBalanceSummary {
  id: number;
  bankAccountId: number;
  balance: string;
  currencyCode: string;
  interestRate: number | null;
  createdAt: string;
  updatedAt: string;
}
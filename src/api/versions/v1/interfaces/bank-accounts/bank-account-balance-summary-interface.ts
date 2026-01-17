export interface BankAccountBalanceSummary {
  id: number;
  bankAccountId: number;
  balance: string;
  currencyCode: string;
  interestRate: string | null;
  createdAt: string;
  updatedAt: string;
}
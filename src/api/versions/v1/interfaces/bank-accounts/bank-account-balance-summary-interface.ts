export interface BankAccountBalanceSummary {
  id: number;
  bankAccountId: number;
  balance: string;
  currencyCode: string;
  interestRate: string | null;
  interestRateStartDate: string | null;
  interestRateEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

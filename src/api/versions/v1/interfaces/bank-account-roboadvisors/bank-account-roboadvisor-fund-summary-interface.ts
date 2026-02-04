export interface BankAccountRoboadvisorFundSummary {
  id: number;
  bankAccountRoboadvisorId: number;
  name: string;
  isin: string;
  assetClass: string;
  region: string;
  fundCurrencyCode: string;
  weight: string;
  shareCount: string | null;
  createdAt: string;
  updatedAt: string;
}


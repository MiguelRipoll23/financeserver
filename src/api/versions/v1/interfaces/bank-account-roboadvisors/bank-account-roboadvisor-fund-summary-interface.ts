export interface BankAccountRoboadvisorFundSummary {
  id: number;
  roboadvisorId: number;
  name: string;
  isin: string;
  assetClass: string;
  region: string;
  fundCurrencyCode: string;
  weight: number;
  shareCount: number | null;
  createdAt: string;
  updatedAt: string;
}

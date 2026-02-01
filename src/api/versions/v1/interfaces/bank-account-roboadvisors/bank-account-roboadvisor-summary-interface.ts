export interface BankAccountRoboadvisorSummary {
  id: number;
  name: string;
  bankAccountId: number;
  riskLevel: number | null;
  managementFeePct: string;
  custodyFeePct: string;
  fundTerPct: string;
  totalFeePct: string;
  managementFeeFrequency: string;
  custodyFeeFrequency: string;
  terPricedInNav: boolean;
  createdAt: string;
  updatedAt: string;
}

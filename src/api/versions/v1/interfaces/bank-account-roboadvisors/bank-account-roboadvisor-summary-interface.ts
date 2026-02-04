export interface BankAccountRoboadvisorSummary {
  id: number;
  name: string;
  bankAccountId: number;
  riskLevel: number | null;
  managementFeePercentage: string;
  custodyFeePercentage: string;
  fundTerPercentage: string;
  totalFeePercentage: string;
  managementFeeFrequency: string;
  custodyFeeFrequency: string;
  terPricedInNav: boolean;
  capitalGainsTaxPercentage: string | null;
  createdAt: string;
  updatedAt: string;
}


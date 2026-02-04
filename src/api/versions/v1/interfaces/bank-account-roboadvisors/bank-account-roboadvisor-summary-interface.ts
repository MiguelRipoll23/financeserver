export interface BankAccountRoboadvisorSummary {
  id: number;
  name: string;
  bankAccountId: number;
  riskLevel: number | null;
  managementFeePercentage: number;
  custodyFeePercentage: number;
  fundTerPercentage: number;
  totalFeePercentage: number;
  managementFeeFrequency: string;
  custodyFeeFrequency: string;
  terPricedInNav: boolean;
  capitalGainsTaxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValueAfterTax: string;
    calculatedAt: string;
  } | null;
}

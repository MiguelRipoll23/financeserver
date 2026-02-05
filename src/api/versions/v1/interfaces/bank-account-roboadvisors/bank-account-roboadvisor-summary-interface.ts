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
  taxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    currentValue: string;
    currencyCode: string;
    calculatedAt: string;
  } | null;
}

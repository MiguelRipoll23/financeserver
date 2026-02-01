export interface BankAccountRoboadvisorSummary {
  id: number;
  name: string;
  bankAccountId: number;
  riskLevel: number | null;
  managementFeePercentage: string;
  custodyFeePercentage: string;
  fundTotalExpenseRatioPercentage: string;
  totalFeePercentage: string;
  managementFeeFrequency: string;
  custodyFeeFrequency: string;
  totalExpenseRatioPricedInNav: boolean;
  createdAt: string;
  updatedAt: string;
}

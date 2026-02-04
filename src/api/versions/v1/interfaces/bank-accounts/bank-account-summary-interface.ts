import { BankAccountType } from "../../enums/bank-account-type-enum.ts";

export interface BankAccountSummary {
  id: number;
  name: string;
  type: BankAccountType;
  taxPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  latestCalculation: {
    monthlyProfit: string;
    annualProfit: string;
    currencyCode: string;
    calculatedAt: string;
  } | null;
}

import { BankAccountType } from "../../enums/bank-account-type-enum.ts";

export interface BankAccountSummary {
  id: number;
  name: string;
  type: BankAccountType;
  createdAt: string;
  updatedAt: string;
}

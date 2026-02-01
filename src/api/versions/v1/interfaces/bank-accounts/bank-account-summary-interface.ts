export type BankAccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "loan"
  | "deposit"
  | "other";

export interface BankAccountSummary {
  id: number;
  name: string;
  type: BankAccountType;
  createdAt: string;
  updatedAt: string;
}

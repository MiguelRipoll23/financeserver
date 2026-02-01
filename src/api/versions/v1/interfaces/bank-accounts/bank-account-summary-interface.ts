/*
  NOTE: This file defines `BankAccountType` locally which duplicates the
  enum declared in `src/api/versions/v1/enums/bank-account-type-enum.ts`.
  To avoid divergence and maintain a single source of truth, import the
  enum instead of redefining the type:

    import { BankAccountType } from "../../enums/bank-account-type-enum";

  Keep the local definition only temporarily while migrating callers.
*/
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

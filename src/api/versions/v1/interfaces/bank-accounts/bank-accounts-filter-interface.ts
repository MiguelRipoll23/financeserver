import { SortOrder } from "../../enums/sort-order-enum.ts";
import { BankAccountSortField } from "../../enums/bank-account-sort-field-enum.ts";

export type BankAccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "loan"
  | "deposit"
  | "other";

export interface BankAccountsFilter {
  pageSize?: number;
  cursor?: string;
  sortField?: BankAccountSortField;
  sortOrder?: SortOrder;
  name?: string;
  type?: BankAccountType;
}

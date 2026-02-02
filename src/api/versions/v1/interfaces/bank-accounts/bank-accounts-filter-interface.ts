import { SortOrder } from "../../enums/sort-order-enum.ts";
import { BankAccountSortField } from "../../enums/bank-account-sort-field-enum.ts";
import type { BankAccountType } from "../../enums/bank-account-type-enum.ts";

export type { BankAccountType };

export interface BankAccountsFilter {
  pageSize?: number;
  cursor?: string;
  sortField?: BankAccountSortField;
  sortOrder?: SortOrder;
  name?: string;
  type?: BankAccountType;
}

import { BankAccountRoboadvisorBalanceSortField } from "../../enums/bank-account-roboadvisor-balance-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface BankAccountRoboadvisorBalancesFilter {
  bankAccountRoboadvisorId?: number;
  pageSize?: number;
  cursor?: string;
  sortField?: BankAccountRoboadvisorBalanceSortField;
  sortOrder?: SortOrder;
}

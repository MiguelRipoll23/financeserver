import { BankAccountRoboadvisorSortField } from "../../enums/bank-account-roboadvisor-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface BankAccountRoboadvisorsFilter {
  bankAccountId?: number;
  name?: string;
  pageSize?: number;
  cursor?: string;
  sortField?: BankAccountRoboadvisorSortField;
  sortOrder?: SortOrder;
}

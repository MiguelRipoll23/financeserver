import { BankAccountRoboadvisorFundSortField } from "../../enums/bank-account-roboadvisor-fund-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface BankAccountRoboadvisorFundsFilter {
  roboadvisorId?: number;
  name?: string;
  isin?: string;
  assetClass?: string;
  region?: string;
  fundCurrencyCode?: string;
  pageSize?: number;
  cursor?: string;
  sortField?: BankAccountRoboadvisorFundSortField;
  sortOrder?: SortOrder;
}

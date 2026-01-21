import { SortOrder } from "../../enums/sort-order-enum.ts";
import { CashSortField } from "../../enums/cash-sort-field-enum.ts";

export interface CashFilter {
  pageSize?: number;
  cursor?: string;
  sortField?: CashSortField;
  sortOrder?: SortOrder;
  label?: string;
}

import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { BillSortField } from "../../enums/bill-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface BillsFilter extends PaginationParams {
  startDate?: string;
  endDate?: string;
  category?: string;
  minimumTotalAmount?: string;
  maximumTotalAmount?: string;
  sortField?: BillSortField;
  sortOrder?: SortOrder;
}

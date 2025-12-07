import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { BillSortField } from "../../enums/bill-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface BillsFilter extends PaginationParams {
  startDate?: string | null;
  endDate?: string | null;
  category?: string | null;
  minimumTotalAmount?: string | null;
  maximumTotalAmount?: string | null;
  sortField?: BillSortField | null;
  sortOrder?: SortOrder | null;
}

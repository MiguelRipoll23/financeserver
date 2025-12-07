import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { ReceiptSortField } from "../../enums/receipt-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface ReceiptsFilter extends PaginationParams {
  startDate?: string | null;
  endDate?: string | null;
  minimumTotalAmount?: string | null;
  maximumTotalAmount?: string | null;
  productName?: string | null;
  sortField?: ReceiptSortField | null;
  sortOrder?: SortOrder | null;
}

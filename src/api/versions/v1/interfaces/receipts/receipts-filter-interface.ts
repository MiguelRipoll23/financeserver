import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { ReceiptSortField } from "../../enums/receipt-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface ReceiptsFilter extends PaginationParams {
  startDate?: string;
  endDate?: string;
  minimumTotalAmount?: string;
  maximumTotalAmount?: string;
  productName?: string;
  merchantId?: number;
  sortField?: ReceiptSortField;
  sortOrder?: SortOrder;
}

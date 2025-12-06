import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface PriceDeltaFilter extends PaginationParams {
  startDate?: string;
  endDate?: string;
  sortOrder?: SortOrder;
}

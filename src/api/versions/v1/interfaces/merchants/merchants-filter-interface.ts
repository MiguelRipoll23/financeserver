import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface MerchantsFilter extends PaginationParams {
  name?: string;
  sortOrder?: SortOrder;
}

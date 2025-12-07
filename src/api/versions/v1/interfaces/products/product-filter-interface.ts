import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { ProductSortField } from "../../enums/product-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface ProductFilter extends PaginationParams {
  query?: string | null;
  minimumUnitPrice?: number | null;
  maximumUnitPrice?: number | null;
  sortField?: ProductSortField | null;
  sortOrder?: SortOrder | null;
}

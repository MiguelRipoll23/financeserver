import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { ProductSortField } from "../../enums/product-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface ProductFilter extends PaginationParams {
  query?: string;
  minimumUnitPrice?: number;
  maximumUnitPrice?: number;
  sortField?: ProductSortField;
  sortOrder?: SortOrder;
}

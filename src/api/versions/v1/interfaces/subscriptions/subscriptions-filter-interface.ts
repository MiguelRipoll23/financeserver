import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { SubscriptionSortField } from "../../enums/subscription-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface SubscriptionsFilter extends PaginationParams {
  name?: string;
  category?: string;
  recurrence?: string;
  minimumAmount?: string;
  maximumAmount?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  currencyCode?: string;
  sortField?: SubscriptionSortField;
  sortOrder?: SortOrder;
}

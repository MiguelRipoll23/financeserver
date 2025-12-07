import { PaginationParams } from "../pagination/pagination-params-interface.ts";
import { SubscriptionSortField } from "../../enums/subscription-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface SubscriptionsFilter extends PaginationParams {
  name?: string | null;
  category?: string | null;
  recurrence?: string | null;
  minimumAmount?: string | null;
  maximumAmount?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  currencyCode?: string | null;
  sortField?: SubscriptionSortField | null;
  sortOrder?: SortOrder | null;
}

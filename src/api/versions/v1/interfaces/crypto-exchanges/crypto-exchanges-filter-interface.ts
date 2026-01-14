import { CryptoExchangeSortField } from "../../enums/crypto-exchange-sort-field-enum.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";

export interface CryptoExchangesFilter {
  pageSize?: number;
  cursor?: string;
  sortField?: CryptoExchangeSortField;
  sortOrder?: SortOrder;
  name?: string;
}

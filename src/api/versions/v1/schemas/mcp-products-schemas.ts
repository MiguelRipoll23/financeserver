import { z } from "zod";
import { ProductSortField } from "../enums/product-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

export const FilterProductsToolSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Search query to filter products by name (partial match). Try singular/plural if no results."
    ),
  min_unit_price: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Minimum unit price for products (format: 123.45, no currency symbol)"
    ),
  max_unit_price: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Maximum unit price for products (format: 123.45, no currency symbol)"
    ),
  sort_field: z
    .nativeEnum(ProductSortField)
    .optional()
    .describe("Field to sort products by"),
  sort_order: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Order to sort results (ascending or descending)"),
  limit: z
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .describe("Maximum number of products to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

export const FilterProductPriceDeltasToolSchema = z.object({
  start_date: z
    .string()
    .optional()
    .describe("Start date for price delta analysis (format: YYYY-MM-DD)"),
  end_date: z
    .string()
    .optional()
    .describe("End date for price delta analysis (format: YYYY-MM-DD)"),
  sort_order: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Order to sort results by price delta (ascending or descending)"),
  limit: z
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .describe("Maximum number of price deltas to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

export const FixProductToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("The unique identifier of the product to update"),
  name: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe(
      "The new name for the product. Use this to fix incorrect product names created during receipt processing."
    ),
  unit_price: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "The unit price for the product (format: 123.45, no currency symbol). When provided, this will add or update a price variation in the item_prices table."
    ),
  currency_code: z
    .string()
    .length(3)
    .optional()
    .describe(
      "The ISO 4217 currency code (e.g., EUR, USD). Required when unit_price is provided. Defaults to EUR."
    ),
  price_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "The date for the price variation (format: YYYY-MM-DD). Defaults to current date. Use this to backdate price corrections."
    ),
});

import { z } from "zod";
import { ProductSortField } from "../enums/product-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

export const FilterProductsToolSchema = z.object({
  query: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Search query to filter products by name (partial match). Try singular/plural if no results."
    ),
  minUnitPrice: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .nullable()
    .describe(
      "Minimum unit price for products (format: 123.45, no currency symbol)"
    ),
  maxUnitPrice: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .nullable()
    .describe(
      "Maximum unit price for products (format: 123.45, no currency symbol)"
    ),
  sortField: z
    .nativeEnum(ProductSortField)
    .optional()
    .nullable()
    .describe("Field to sort products by"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .nullable()
    .describe("Order to sort results (ascending or descending)"),
  limit: z
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .nullable()
    .describe("Maximum number of products to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .nullable()
    .describe("Pagination cursor for retrieving next page of results"),
});

export const FilterProductPriceDeltasToolSchema = z.object({
  startDate: z
    .string()
    .optional()
    .nullable()
    .describe("Start date for price delta analysis (format: YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .nullable()
    .describe("End date for price delta analysis (format: YYYY-MM-DD)"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .nullable()
    .describe("Order to sort results by price delta (ascending or descending)"),
  limit: z
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .nullable()
    .describe("Maximum number of price deltas to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .nullable()
    .describe("Pagination cursor for retrieving next page of results"),
});

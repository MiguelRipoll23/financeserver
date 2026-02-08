import { z } from "@hono/zod-openapi";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { ProductSortField } from "../enums/product-sort-field-enum.ts";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

const MonetaryFilterSchema = z.coerce.number().min(0).optional();

export const GetProductsRequestSchema = PaginationQuerySchema.extend({
  query: z
    .string()
    .min(1)
    .max(256)
    .openapi({ example: "coffee" })
    .describe("Search query for product name or description.")
    .optional(),
  minimumUnitPrice: MonetaryFilterSchema.describe(
    "Minimum unit price filter.",
  ).optional(),
  maximumUnitPrice: MonetaryFilterSchema.describe(
    "Maximum unit price filter.",
  ).optional(),
  sortField: z
    .nativeEnum(ProductSortField)
    .openapi({ example: ProductSortField.ProductName })
    .describe("Field to sort products by.")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Asc })
    .describe("Sort order direction (ascending or descending).")
    .optional(),
});

export type GetProductsRequest = z.infer<typeof GetProductsRequestSchema>;

export const ProductSummarySchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 10 })
    .describe("Unique product identifier."),
  name: z
    .string()
    .openapi({ example: "Coffee beans" })
    .describe("Name of the product."),
  latestUnitPrice: MonetaryStringSchema.describe(
    "Latest unit price of the product as a string.",
  ),
  currencyCode: z
    .string()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code for the product price."),
  totalQuantity: z
    .number()
    .int()
    .openapi({ example: 15 })
    .describe("Total quantity of product available.")
    .optional(),
});

export const ProductIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ example: 12 })
    .describe("Unique product identifier (positive integer)."),
});

export type ProductIdParams = z.infer<typeof ProductIdParamSchema>;

export const UpdateProductRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .openapi({ example: "Coffee beans" })
    .describe("Name of the product."),
  unitPrice: MonetaryStringSchema.describe(
    "Unit price of the product as a string.",
  ),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code for the product price."),
  priceDate: DateOnlyStringSchema.describe(
    "Date when the price was set (YYYY-MM-DD).",
  ).optional(),
});

export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const UpdateProductResponseSchema = ProductSummarySchema;

export type UpdateProductResponse = z.infer<typeof UpdateProductResponseSchema>;

export const GetProductsResponseSchema = z.object({
  results: z.array(ProductSummarySchema).describe("List of product summaries."),
  limit: z.number().int().describe("Maximum number of products returned."),
  offset: z
    .number()
    .int()
    .describe(
      "Number of products skipped before starting to collect the result set.",
    ),
  total: z.number().int().describe("Total number of products available."),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results, if any."),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results, if any."),
});

export type GetProductsResponse = z.infer<typeof GetProductsResponseSchema>;

export const GetProductPriceDeltasQuerySchema = PaginationQuerySchema.extend({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .openapi({ example: "2025-01-01" })
    .describe("Start date for price delta calculation (YYYY-MM-DD).")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .openapi({ example: "2025-01-31" })
    .describe("End date for price delta calculation (YYYY-MM-DD).")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Desc })
    .describe("Sort order direction (ascending or descending).")
    .optional(),
});

export type GetProductPriceDeltasQuery = z.infer<
  typeof GetProductPriceDeltasQuerySchema
>;

export const ProductPriceDeltaSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 10 })
    .describe("Unique product identifier."),
  name: z
    .string()
    .openapi({ example: "Coffee beans" })
    .describe("Name of the product."),
  minimumPrice: MonetaryStringSchema.describe(
    "Minimum price of the product in the selected period as a string.",
  ),
  maximumPrice: MonetaryStringSchema.describe(
    "Maximum price of the product in the selected period as a string.",
  ),
  priceDelta: MonetaryStringSchema.describe(
    "Difference between maximum and minimum price as a string.",
  ),
  currencyCode: z
    .string()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code for the product price."),
});

export const GetProductPriceDeltasResponseSchema = z.object({
  results: z
    .array(ProductPriceDeltaSchema)
    .describe("List of product price delta summaries."),
  limit: z
    .number()
    .int()
    .describe("Maximum number of product price deltas returned."),
  offset: z
    .number()
    .int()
    .describe(
      "Number of product price deltas skipped before starting to collect the result set.",
    ),
  total: z
    .number()
    .int()
    .describe("Total number of product price deltas available."),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results, if any."),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results, if any."),
});

export type GetProductPriceDeltasResponse = z.infer<
  typeof GetProductPriceDeltasResponseSchema
>;

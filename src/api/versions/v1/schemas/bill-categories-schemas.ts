import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BillCategorySortField } from "../enums/bill-category-sort-field-enum.ts";

export const BillCategorySchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique identifier for the bill category"),
  name: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "Groceries" })
    .describe("Name of the bill category"),
  normalizedName: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "groceries" })
    .describe("Normalized name of the bill category"),
  favoritedAt: z
    .string()
    .datetime()
    .nullable()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Timestamp when the bill category was favorited, or null"),
  createdAt: z
    .string()
    .datetime()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Creation timestamp in ISO format"),
  updatedAt: z
    .string()
    .datetime()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Last update timestamp in ISO format"),
});

export type BillCategoryResponse = z.infer<typeof BillCategorySchema>;

export const CreateBillCategoryRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "Transportation" })
    .describe("Name of the new bill category"),
});

export type CreateBillCategoryRequest = z.infer<
  typeof CreateBillCategoryRequestSchema
>;

export const CreateBillCategoryResponseSchema = BillCategorySchema;

export type CreateBillCategoryResponse = z.infer<
  typeof CreateBillCategoryResponseSchema
>;

export const UpdateBillCategoryRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "New Category Name" })
    .describe("Updated name for the bill category")
    .optional(),
  favoritedAt: z
    .string()
    .datetime()
    .nullable()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Timestamp when the bill category was favorited, or null")
    .optional(),
});

export type UpdateBillCategoryRequest = z.infer<
  typeof UpdateBillCategoryRequestSchema
>;

export const UpdateBillCategoryResponseSchema = BillCategorySchema;

export type UpdateBillCategoryResponse = z.infer<
  typeof UpdateBillCategoryResponseSchema
>;

export const BillCategoryIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ example: 42 })
    .describe("Unique bill category identifier"),
});

export type BillCategoryIdParams = z.infer<typeof BillCategoryIdParamSchema>;

export const GetBillCategoriesRequestSchema = PaginationQuerySchema.extend({
  name: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "Utilities" })
    .describe("Filter by bill category name")
    .optional(),
  sortField: z
    .nativeEnum(BillCategorySortField)
    .openapi({ example: BillCategorySortField.Name })
    .describe("Field to sort bill categories by")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Asc })
    .describe("Sort order (ascending or descending)")
    .optional(),
});

export type GetBillCategoriesRequest = z.infer<
  typeof GetBillCategoriesRequestSchema
>;

export const GetBillCategoriesResponseSchema = z.object({
  results: z
    .array(BillCategorySchema)
    .describe("List of bill category summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of bill categories matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetBillCategoriesResponse = z.infer<
  typeof GetBillCategoriesResponseSchema
>;

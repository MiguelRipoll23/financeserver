import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

export const UpsertMerchantRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Amazon" })
    .describe("Merchant name"),
});

export type UpsertMerchantRequest = z.infer<
  typeof UpsertMerchantRequestSchema
>;

export const UpsertMerchantResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 12 })
    .describe("Unique merchant identifier"),
  name: z
    .string()
    .openapi({ example: "Amazon" })
    .describe("Merchant name"),
  createdAt: z
    .string()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Creation timestamp in ISO format"),
  updatedAt: z
    .string()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Last update timestamp in ISO format"),
});

export type UpsertMerchantResponse = z.infer<
  typeof UpsertMerchantResponseSchema
>;

export const MerchantSummarySchema = UpsertMerchantResponseSchema;
export type MerchantSummaryResponse = z.infer<typeof MerchantSummarySchema>;

export const MerchantIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ example: 42 })
    .describe("Unique merchant identifier"),
});

export type MerchantIdParams = z.infer<typeof MerchantIdParamSchema>;

export const GetMerchantsRequestSchema = PaginationQuerySchema.extend({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Amazon" })
    .describe("Filter by merchant name (case insensitive partial match)")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Asc })
    .describe("Sort order by name (ascending or descending)")
    .optional(),
});

export type GetMerchantsRequest = z.infer<typeof GetMerchantsRequestSchema>;

export const GetMerchantsResponseSchema = z.object({
  results: z.array(MerchantSummarySchema).describe("List of merchant summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z.number().int().describe("Total number of merchants matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetMerchantsResponse = z.infer<typeof GetMerchantsResponseSchema>;

export const UpdateMerchantRequestSchema = UpsertMerchantRequestSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field to update must be provided.",
  }
);
export type UpdateMerchantRequest = z.infer<typeof UpdateMerchantRequestSchema>;

export const UpdateMerchantResponseSchema = UpsertMerchantResponseSchema;
export type UpdateMerchantResponse = z.infer<
  typeof UpdateMerchantResponseSchema
>;

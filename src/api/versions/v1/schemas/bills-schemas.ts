import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { BillSortField } from "../enums/bill-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

export const UpsertBillRequestSchema = z.object({
  date: DateOnlyStringSchema.describe("Date of the bill in YYYY-MM-DD format"),
  category: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "gas" })
    .describe("Bill category name"),
  totalAmount: MonetaryStringSchema.describe(
    "Total amount of the bill as a string",
  ),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
  senderEmail: z
    .string()
    .email()
    .openapi({ example: "example@example.com" })
    .describe("Sender's email address")
    .optional(),
});

export type UpsertBillRequest = z.infer<typeof UpsertBillRequestSchema>;

export const UpsertBillResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 12 })
    .describe("Unique bill identifier"),
  date: z
    .string()
    .openapi({ example: "2025-03-14T00:00:00.000Z" })
    .describe("Bill date in ISO format"),
  category: z
    .string()
    .openapi({ example: "gas" })
    .describe("Bill category name"),
  totalAmount: MonetaryStringSchema.describe(
    "Total amount of the bill as a string",
  ),
  currencyCode: z
    .string()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
  senderEmail: z
    .string()
    .email()
    .nullable()
    .openapi({ example: "example@example.com" })
    .describe("Sender's email address or null"),
  favoritedAt: z
    .string()
    .datetime()
    .nullable()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Timestamp when the bill category was favorited, or null"),
  updatedAt: z
    .string()
    .openapi({ example: "2025-03-14T12:34:56.000Z" })
    .describe("Last update timestamp in ISO format"),
});

export type UpsertBillResponse = z.infer<typeof UpsertBillResponseSchema>;

export const BillSummarySchema = UpsertBillResponseSchema;

export type BillSummaryResponse = z.infer<typeof BillSummarySchema>;

export const BillIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ example: 42 })
    .describe("Unique bill identifier"),
});

export type BillIdParams = z.infer<typeof BillIdParamSchema>;

export const GetBillsRequestSchema = PaginationQuerySchema.extend({
  startDate: DateOnlyStringSchema.optional().describe(
    "Filter bills from this start date (YYYY-MM-DD)",
  ),
  endDate: DateOnlyStringSchema.optional().describe(
    "Filter bills up to this end date (YYYY-MM-DD)",
  ),
  category: z
    .string()
    .min(1)
    .max(128)
    .openapi({ example: "Utilities" })
    .describe("Filter by bill category name")
    .optional(),
  minimumTotalAmount: MonetaryStringSchema.optional().describe(
    "Filter bills with total amount greater than or equal to this value",
  ),
  maximumTotalAmount: MonetaryStringSchema.optional().describe(
    "Filter bills with total amount less than or equal to this value",
  ),
  sortField: z
    .nativeEnum(BillSortField)
    .openapi({ example: BillSortField.BillDate })
    .describe("Field to sort bills by")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Desc })
    .describe("Sort order (ascending or descending)")
    .optional(),
});

export type GetBillsRequest = z.infer<typeof GetBillsRequestSchema>;

export const GetBillsResponseSchema = z.object({
  results: z.array(BillSummarySchema).describe("List of bill summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z.number().int().describe("Total number of bills matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetBillsResponse = z.infer<typeof GetBillsResponseSchema>;

export const UpdateBillRequestSchema = UpsertBillRequestSchema;
export type UpdateBillRequest = z.infer<typeof UpdateBillRequestSchema>;

export const UpdateBillResponseSchema = UpsertBillResponseSchema;
export type UpdateBillResponse = z.infer<typeof UpdateBillResponseSchema>;

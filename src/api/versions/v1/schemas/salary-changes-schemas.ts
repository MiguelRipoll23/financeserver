import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";
import { SalaryChangeSortField } from "../enums/salary-change-sort-field-enum.ts";
import { Recurrence } from "../enums/recurrence-enum.ts";

export const SalaryChangeSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique identifier for the salary change"),
  recurrence: z
    .nativeEnum(Recurrence)
    .openapi({ example: Recurrence.Monthly })
    .describe("Recurrence of the salary change"),
  netAmount: MonetaryStringSchema.describe(
    "Net amount of the salary change as a string",
  ),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
  date: z
    .string()
    .date()
    .openapi({ example: "2025-03-14" })
    .describe("Date of the salary change (ISO 8601 format: YYYY-MM-DD)"),
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

export type SalaryChangeResponse = z.infer<typeof SalaryChangeSchema>;

export const CreateSalaryChangeRequestSchema = z.object({
  recurrence: z
    .nativeEnum(Recurrence)
    .openapi({ example: Recurrence.Monthly })
    .describe("Recurrence of the salary change"),
  netAmount: MonetaryStringSchema.describe(
    "Net amount of the salary change as a string",
  ),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
  date: z
    .string()
    .date()
    .openapi({ example: "2025-03-14" })
    .describe("Date of the salary change (ISO 8601 format: YYYY-MM-DD)"),
});

export type CreateSalaryChangeRequest = z.infer<
  typeof CreateSalaryChangeRequestSchema
>;

export const CreateSalaryChangeResponseSchema = SalaryChangeSchema;

export type CreateSalaryChangeResponse = z.infer<
  typeof CreateSalaryChangeResponseSchema
>;

export const UpdateSalaryChangeRequestSchema = z.object({
  recurrence: z
    .nativeEnum(Recurrence)
    .openapi({ example: Recurrence.Monthly })
    .describe("Updated recurrence for the salary change")
    .optional(),
  netAmount: MonetaryStringSchema.describe(
    "Net amount of the salary change as a string",
  ).optional(),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code")
    .optional(),
  date: z
    .string()
    .date()
    .openapi({ example: "2025-03-14" })
    .describe("Date of the salary change (ISO 8601 format: YYYY-MM-DD)")
    .optional(),
});

export type UpdateSalaryChangeRequest = z.infer<
  typeof UpdateSalaryChangeRequestSchema
>;

export const UpdateSalaryChangeResponseSchema = SalaryChangeSchema;

export type UpdateSalaryChangeResponse = z.infer<
  typeof UpdateSalaryChangeResponseSchema
>;

export const SalaryChangeIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ example: 42 })
    .describe("Unique salary change identifier"),
});

export type SalaryChangeIdParams = z.infer<typeof SalaryChangeIdParamSchema>;

export const GetSalaryChangesRequestSchema = PaginationQuerySchema.extend({
  recurrence: z
    .nativeEnum(Recurrence)
    .openapi({ example: Recurrence.Monthly })
    .describe("Filter by salary change recurrence")
    .optional(),
  minimumNetAmount: MonetaryStringSchema.optional().describe(
    "Filter salary changes with net amount greater than or equal to this value",
  ),
  maximumNetAmount: MonetaryStringSchema.optional().describe(
    "Filter salary changes with net amount less than or equal to this value",
  ),
  sortField: z
    .nativeEnum(SalaryChangeSortField)
    .openapi({ example: SalaryChangeSortField.CreatedAt })
    .describe("Field to sort salary changes by")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Desc })
    .describe("Sort order (ascending or descending)")
    .optional(),
});

export type GetSalaryChangesRequest = z.infer<
  typeof GetSalaryChangesRequestSchema
>;

export const ListSalaryChangesRequestBodySchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .openapi({ example: 20 })
    .describe("Maximum number of results to return")
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .openapi({ example: 0 })
    .describe("Number of results to skip")
    .optional(),
  cursor: z
    .string()
    .openapi({ example: "abc123" })
    .describe("Cursor for pagination")
    .optional(),
  recurrence: z
    .nativeEnum(Recurrence)
    .openapi({ example: Recurrence.Monthly })
    .describe("Filter by salary change recurrence")
    .optional(),
  minimumNetAmount: MonetaryStringSchema.optional().describe(
    "Filter salary changes with net amount greater than or equal to this value",
  ),
  maximumNetAmount: MonetaryStringSchema.optional().describe(
    "Filter salary changes with net amount less than or equal to this value",
  ),
  sortField: z
    .nativeEnum(SalaryChangeSortField)
    .openapi({ example: SalaryChangeSortField.CreatedAt })
    .describe("Field to sort salary changes by")
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .openapi({ example: SortOrder.Desc })
    .describe("Sort order (ascending or descending)")
    .optional(),
});

export type ListSalaryChangesRequestBody = z.infer<
  typeof ListSalaryChangesRequestBodySchema
>;

export const GetSalaryChangesResponseSchema = z.object({
  results: z
    .array(SalaryChangeSchema)
    .describe("List of salary change summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of salary changes matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetSalaryChangesResponse = z.infer<
  typeof GetSalaryChangesResponseSchema
>;

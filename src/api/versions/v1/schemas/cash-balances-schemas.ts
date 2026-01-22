import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { CashBalanceSortField } from "../enums/cash-balance-sort-field-enum.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

// Cash Balance schemas
export const CreateCashBalanceRequestSchema = z.object({
  cashId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Cash source identifier"),
  balance: MonetaryStringSchema.describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
});

export type CreateCashBalanceRequest = z.infer<
  typeof CreateCashBalanceRequestSchema
>;

export const CreateCashBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cashId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateCashBalanceResponse = z.infer<
  typeof CreateCashBalanceResponseSchema
>;

export const CashBalanceIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: "1",
    }),
});

export type CashBalanceIdParam = z.infer<typeof CashBalanceIdParamSchema>;

export const GetCashBalancesRequestSchema = PaginationQuerySchema.extend({
  cashId: z
    .number()
    .int()
    .openapi({ example: 1, type: "integer" })
    .describe("Cash source identifier"),
  sortField: z
    .nativeEnum(CashBalanceSortField)
    .optional()
    .openapi({ example: CashBalanceSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
});

export type GetCashBalancesRequest = z.infer<
  typeof GetCashBalancesRequestSchema
>;

export const CashBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cashId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetCashBalancesResponseSchema = z.object({
  results: z.array(CashBalanceSummarySchema).describe("List of cash balance summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of cash balances matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetCashBalancesResponse = z.infer<
  typeof GetCashBalancesResponseSchema
>;

export const UpdateCashBalanceRequestSchema = z.object({
  balance: MonetaryStringSchema.optional().describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
});

export type UpdateCashBalanceRequest = z.infer<
  typeof UpdateCashBalanceRequestSchema
>;

export const UpdateCashBalanceResponseSchema = CreateCashBalanceResponseSchema;

export type UpdateCashBalanceResponse = z.infer<
  typeof UpdateCashBalanceResponseSchema
>;

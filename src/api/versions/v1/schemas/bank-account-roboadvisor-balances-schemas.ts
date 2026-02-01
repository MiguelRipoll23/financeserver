import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorBalanceSortField } from "../enums/bank-account-roboadvisor-balance-sort-field-enum.ts";

// Roboadvisor Balance schemas
export const CreateBankAccountRoboadvisorBalanceRequestSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Associated roboadvisor identifier"),
  date: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .openapi({ example: "2026-01-15" })
    .describe("Transaction date (YYYY-MM-DD)"),
  type: z
    .enum(["deposit", "withdrawal", "adjustment"])
    .openapi({ example: "deposit" })
    .describe("Transaction type"),
  amount: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .openapi({ example: "1000.00" })
    .describe("Transaction amount"),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "EUR" })
    .describe("ISO 4217 currency code"),
});

export type CreateBankAccountRoboadvisorBalanceRequest = z.infer<
  typeof CreateBankAccountRoboadvisorBalanceRequestSchema
>;

export const CreateBankAccountRoboadvisorBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  date: z.string().openapi({ example: "2026-01-15" }),
  type: z.string().openapi({ example: "deposit" }),
  amount: z.string().openapi({ example: "1000.00" }),
  currencyCode: z.string().openapi({ example: "EUR" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountRoboadvisorBalanceResponse = z.infer<
  typeof CreateBankAccountRoboadvisorBalanceResponseSchema
>;

export const BankAccountRoboadvisorBalanceIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountRoboadvisorBalanceIdParam = z.infer<
  typeof BankAccountRoboadvisorBalanceIdParamSchema
>;

export const GetBankAccountRoboadvisorBalancesRequestSchema = PaginationQuerySchema.extend({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .optional()
    .openapi({ example: 1, type: "integer" })
    .describe("Roboadvisor identifier (optional)"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorBalanceSortField)
    .optional()
    .openapi({ example: BankAccountRoboadvisorBalanceSortField.Date }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
});

export type GetBankAccountRoboadvisorBalancesRequest = z.infer<
  typeof GetBankAccountRoboadvisorBalancesRequestSchema
>;

export const BankAccountRoboadvisorBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  date: z.string().openapi({ example: "2026-01-15" }),
  type: z.string().openapi({ example: "deposit" }),
  amount: z.string().openapi({ example: "1000.00" }),
  currencyCode: z.string().openapi({ example: "EUR" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountRoboadvisorBalancesResponseSchema = z.object({
  results: z
    .array(BankAccountRoboadvisorBalanceSummarySchema)
    .describe("List of roboadvisor balance records"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z.number().int().describe("Total number of balance records matching the query"),
  nextCursor: z.string().nullable().describe("Cursor for the next page of results or null"),
  previousCursor: z.string().nullable().describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountRoboadvisorBalancesResponse = z.infer<
  typeof GetBankAccountRoboadvisorBalancesResponseSchema
>;

export const UpdateBankAccountRoboadvisorBalanceRequestSchema = z.object({
  date: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional()
    .openapi({ example: "2026-01-15" })
    .describe("Transaction date (YYYY-MM-DD)"),
  type: z
    .enum(["deposit", "withdrawal", "adjustment"])
    .optional()
    .openapi({ example: "deposit" })
    .describe("Transaction type"),
  amount: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .optional()
    .openapi({ example: "1000.00" })
    .describe("Transaction amount"),
  currencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "EUR" })
    .describe("ISO 4217 currency code"),
});

export type UpdateBankAccountRoboadvisorBalanceRequest = z.infer<
  typeof UpdateBankAccountRoboadvisorBalanceRequestSchema
>;

export const UpdateBankAccountRoboadvisorBalanceResponseSchema =
  CreateBankAccountRoboadvisorBalanceResponseSchema;

export type UpdateBankAccountRoboadvisorBalanceResponse = z.infer<
  typeof UpdateBankAccountRoboadvisorBalanceResponseSchema
>;

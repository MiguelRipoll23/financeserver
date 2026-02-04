import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountBalanceSortField } from "../enums/bank-account-balance-sort-field-enum.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";

// Bank Account Balance schemas
export const CreateBankAccountBalanceRequestSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Bank account identifier"),
  balance: MonetaryStringSchema.describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
});

export type CreateBankAccountBalanceRequest = z.infer<
  typeof CreateBankAccountBalanceRequestSchema
>;

export const CreateBankAccountBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountBalanceResponse = z.infer<
  typeof CreateBankAccountBalanceResponseSchema
>;

export const BankAccountBalanceIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountBalanceIdParam = z.infer<
  typeof BankAccountBalanceIdParamSchema
>;

export const GetBankAccountBalancesRequestSchema = PaginationQuerySchema.extend(
  {
    bankAccountId: z
      .number()
      .int()
      .optional()
      .openapi({ example: 1, type: "integer" })
      .describe(
        "Bank account identifier (optional - if not provided, returns all balances)",
      ),
    sortField: z
      .nativeEnum(BankAccountBalanceSortField)
      .optional()
      .openapi({ example: BankAccountBalanceSortField.CreatedAt }),
    sortOrder: z
      .nativeEnum(SortOrder)
      .optional()
      .openapi({ example: SortOrder.Desc }),
  },
);

export type GetBankAccountBalancesRequest = z.infer<
  typeof GetBankAccountBalancesRequestSchema
>;

export const BankAccountBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  interestRate: z.number().nullable().optional().openapi({ example: 0.025 }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountBalancesResponseSchema = z.object({
  results: z
    .array(BankAccountBalanceSummarySchema)
    .describe("List of bank account balance summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of bank account balances matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountBalancesResponse = z.infer<
  typeof GetBankAccountBalancesResponseSchema
>;

export const UpdateBankAccountBalanceRequestSchema = z.object({
  balance: MonetaryStringSchema.optional().describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code"),
});

export type UpdateBankAccountBalanceRequest = z.infer<
  typeof UpdateBankAccountBalanceRequestSchema
>;

export const UpdateBankAccountBalanceResponseSchema =
  CreateBankAccountBalanceResponseSchema;

export type UpdateBankAccountBalanceResponse = z.infer<
  typeof UpdateBankAccountBalanceResponseSchema
>;

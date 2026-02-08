import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { BankAccountSortField } from "../enums/bank-account-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountType } from "../enums/bank-account-type-enum.ts";
import { NullablePercentageSchema } from "./percentage-schema.ts";

// Bank Account schemas
export const CreateBankAccountRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Main Savings Account" })
    .describe("Bank account name"),
  type: z
    .nativeEnum(BankAccountType)
    .openapi({ example: "savings" })
    .describe("Bank account type"),
  taxPercentage: NullablePercentageSchema.optional()
    .openapi({ example: 0.19 })
    .describe("Tax percentage as decimal (0.19 = 19%)"),
});

export type CreateBankAccountRequest = z.infer<
  typeof CreateBankAccountRequestSchema
>;

export const CreateBankAccountResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique bank account identifier"),
  name: z.string().openapi({ example: "Main Savings Account" }),
  type: z.nativeEnum(BankAccountType).openapi({ example: "savings" }),
  taxPercentage: z.number().nullable().openapi({ example: 0.19 }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountResponse = z.infer<
  typeof CreateBankAccountResponseSchema
>;

export const BankAccountIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountIdParam = z.infer<typeof BankAccountIdParamSchema>;

export const UpdateBankAccountRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Updated Account Name" })
    .describe("New bank account name")
    .optional(),
  type: z
    .nativeEnum(BankAccountType)
    .openapi({ example: "checking" })
    .describe("New bank account type")
    .optional(),
  taxPercentage: NullablePercentageSchema.optional()
    .openapi({ example: 0.19 })
    .describe("Tax percentage as decimal (0.19 = 19%)"),
});

export type UpdateBankAccountRequest = z.infer<
  typeof UpdateBankAccountRequestSchema
>;

export const BankAccountSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Main Savings Account" }),
  type: z.nativeEnum(BankAccountType).openapi({ example: "savings" }),
  taxPercentage: z.number().nullable().openapi({ example: 0.19 }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  latestCalculation: z
    .object({
      monthlyProfit: z.string().openapi({ example: "25.00" }),
      annualProfit: z.string().openapi({ example: "300.00" }),
      currencyCode: z.string().openapi({ example: "USD" }),
      calculatedAt: z
        .string()
        .datetime()
        .openapi({ example: "2026-02-04T10:30:00Z" }),
    })
    .nullable()
    .describe("Latest interest rate calculation"),
});

export const UpdateBankAccountResponseSchema = BankAccountSummarySchema;

export type UpdateBankAccountResponse = z.infer<
  typeof UpdateBankAccountResponseSchema
>;

export const GetBankAccountsRequestSchema = PaginationQuerySchema.extend({
  sortField: z
    .nativeEnum(BankAccountSortField)
    .optional()
    .openapi({ example: BankAccountSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
  name: z.string().optional().openapi({ example: "Savings" }),
  type: z.nativeEnum(BankAccountType).optional().openapi({
    example: "savings",
  }),
});

export type GetBankAccountsRequest = z.infer<
  typeof GetBankAccountsRequestSchema
>;

export const GetBankAccountsResponseSchema = z.object({
  results: z
    .array(BankAccountSummarySchema)
    .describe("List of bank account summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of bank accounts matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountsResponse = z.infer<
  typeof GetBankAccountsResponseSchema
>;

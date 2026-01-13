import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
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
  interestRate: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .optional()
    .openapi({ example: "2.50" })
    .describe("Interest rate percentage (e.g., 2.50 for 2.50%)"),
  interestRateStartDate: DateOnlyStringSchema.optional().describe(
    "Start date of interest rate period in YYYY-MM-DD format"
  ),
  interestRateEndDate: DateOnlyStringSchema.optional().describe(
    "End date of interest rate period in YYYY-MM-DD format"
  ),
});

export type CreateBankAccountBalanceRequest = z.infer<
  typeof CreateBankAccountBalanceRequestSchema
>;

export const CreateBankAccountBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  interestRate: z.string().nullable().openapi({ example: "2.50" }),
  interestRateStartDate: z
    .string()
    .nullable()
    .openapi({ example: "2026-01-01" }),
  interestRateEndDate: z.string().nullable().openapi({ example: "2026-12-31" }),
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
    bankAccountId: z.coerce
      .number()
      .int()
      .openapi({ example: 1 })
      .describe("Bank account identifier"),
    sortOrder: z
      .nativeEnum(SortOrder)
      .optional()
      .openapi({ example: SortOrder.Desc }),
  }
);

export type GetBankAccountBalancesRequest = z.infer<
  typeof GetBankAccountBalancesRequestSchema
>;

export const BankAccountBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1500.00" }),
  currencyCode: z.string().openapi({ example: "USD" }),
  interestRate: z.string().nullable().openapi({ example: "2.50" }),
  interestRateStartDate: z
    .string()
    .nullable()
    .openapi({ example: "2026-01-01" }),
  interestRateEndDate: z.string().nullable().openapi({ example: "2026-12-31" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountBalancesResponseSchema = z.object({
  data: z.array(BankAccountBalanceSummarySchema),
  nextCursor: z.string().nullable(),
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
  interestRate: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .optional()
    .openapi({ example: "2.50" })
    .describe("Interest rate percentage (e.g., 2.50 for 2.50%)"),
  interestRateStartDate: DateOnlyStringSchema.optional().describe(
    "Start date of interest rate period in YYYY-MM-DD format"
  ),
  interestRateEndDate: DateOnlyStringSchema.optional().describe(
    "End date of interest rate period in YYYY-MM-DD format"
  ),
});

export type UpdateBankAccountBalanceRequest = z.infer<
  typeof UpdateBankAccountBalanceRequestSchema
>;

export const UpdateBankAccountBalanceResponseSchema =
  CreateBankAccountBalanceResponseSchema;

export type UpdateBankAccountBalanceResponse = z.infer<
  typeof UpdateBankAccountBalanceResponseSchema
>;

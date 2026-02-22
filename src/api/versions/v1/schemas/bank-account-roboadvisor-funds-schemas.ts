import { z } from "@hono/zod-openapi";
import { BankAccountRoboadvisorFundSortField } from "../enums/bank-account-roboadvisor-fund-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { PercentageSchema } from "./percentage-schema.ts";

// Roboadvisor Fund schemas
export const CreateBankAccountRoboadvisorFundRequestSchema = z.object({
  roboadvisorId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Associated roboadvisor identifier"),
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Vanguard FTSE All-World UCITS ETF" })
    .describe("Fund name"),
  isin: z
    .string()
    .length(12)
    .openapi({ example: "IE00BK5BQT80" })
    .describe("ISIN code (12 characters)"),
  assetClass: z
    .string()
    .min(1)
    .max(50)
    .openapi({ example: "equity" })
    .describe("Asset class (e.g., equity, bonds)"),
  region: z
    .string()
    .min(1)
    .max(50)
    .openapi({ example: "Global" })
    .describe("Region (e.g., US, Europe, EM, Global)"),
  fundCurrencyCode: z
    .string()
    .length(3)
    .openapi({ example: "USD" })
    .describe("Fund currency ISO 4217 code"),
  weight: PercentageSchema.openapi({ example: 0.39 }).describe(
    "Fund weight as decimal (0.39 = 39%)",
  ),
  shareCount: z
    .number()
    .positive()
    .optional()
    .openapi({ example: 125.5 })
    .describe("Number of shares/units held (can be fractional)"),
});

export type CreateBankAccountRoboadvisorFundRequest = z.infer<
  typeof CreateBankAccountRoboadvisorFundRequestSchema
>;

export const CreateBankAccountRoboadvisorFundResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  roboadvisorId: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Vanguard FTSE All-World UCITS ETF" }),
  isin: z.string().openapi({ example: "IE00BK5BQT80" }),
  assetClass: z.string().openapi({ example: "equity" }),
  region: z.string().openapi({ example: "Global" }),
  fundCurrencyCode: z.string().openapi({ example: "USD" }),
  weight: z.number().openapi({ example: 0.39 }),
  shareCount: z.number().nullable().openapi({ example: 125.5 }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountRoboadvisorFundResponse = z.infer<
  typeof CreateBankAccountRoboadvisorFundResponseSchema
>;

export const BankAccountRoboadvisorFundIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountRoboadvisorFundIdParam = z.infer<
  typeof BankAccountRoboadvisorFundIdParamSchema
>;

export const GetBankAccountRoboadvisorFundsRequestSchema = z.object({
  roboadvisorId: z
    .number()
    .int()
    .optional()
    .openapi({ example: 1 })
    .describe("Filter by roboadvisor ID"),
  name: z
    .string()
    .optional()
    .openapi({ example: "Vanguard" })
    .describe("Filter by fund name (partial match)"),
  isin: z
    .string()
    .optional()
    .openapi({ example: "IE00BK5BQT80" })
    .describe("Filter by ISIN code"),
  assetClass: z
    .string()
    .optional()
    .openapi({ example: "equity" })
    .describe("Filter by asset class"),
  region: z
    .string()
    .optional()
    .openapi({ example: "Global" })
    .describe("Filter by region"),
  fundCurrencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("Filter by fund currency code"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorFundSortField)
    .optional()
    .openapi({ example: BankAccountRoboadvisorFundSortField.Name })
    .describe("Sort field (default: name)"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Asc })
    .describe("Sort order (default: asc)"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .openapi({ example: 10 })
    .describe("Number of results per page (default: 10, max: 100)"),
  cursor: z
    .string()
    .optional()
    .openapi({ example: "10" })
    .describe("Cursor for pagination"),
});

export type GetBankAccountRoboadvisorFundsRequest = z.infer<
  typeof GetBankAccountRoboadvisorFundsRequestSchema
>;

export const BankAccountRoboadvisorFundSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  roboadvisorId: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Vanguard FTSE All-World UCITS ETF" }),
  isin: z.string().openapi({ example: "IE00BK5BQT80" }),
  assetClass: z.string().openapi({ example: "equity" }),
  region: z.string().openapi({ example: "Global" }),
  fundCurrencyCode: z.string().openapi({ example: "USD" }),
  weight: z.number().openapi({ example: 0.39 }),
  shareCount: z.number().nullable().openapi({ example: 125.5 }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountRoboadvisorFundsResponseSchema = z.object({
  results: z
    .array(BankAccountRoboadvisorFundSummarySchema)
    .describe("List of roboadvisor funds"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of fund allocations matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountRoboadvisorFundsResponse = z.infer<
  typeof GetBankAccountRoboadvisorFundsResponseSchema
>;

export const UpdateBankAccountRoboadvisorFundRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .openapi({ example: "Vanguard FTSE All-World UCITS ETF" })
    .describe("Fund name"),
  isin: z
    .string()
    .length(12)
    .optional()
    .openapi({ example: "IE00BK5BQT80" })
    .describe("ISIN code (12 characters)"),
  assetClass: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .openapi({ example: "equity" })
    .describe("Asset class (e.g., equity, bonds)"),
  region: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .openapi({ example: "Global" })
    .describe("Region (e.g., US, Europe, EM, Global)"),
  fundCurrencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("Fund currency ISO 4217 code"),
  weight: PercentageSchema.optional()
    .openapi({ example: 0.39 })
    .describe("Fund weight as decimal (0.39 = 39%)"),
  shareCount: z
    .number()
    .positive()
    .optional()
    .openapi({ example: 125.5 })
    .describe("Number of shares/units held (can be fractional)"),
});

export type UpdateBankAccountRoboadvisorFundRequest = z.infer<
  typeof UpdateBankAccountRoboadvisorFundRequestSchema
>;

export const UpdateBankAccountRoboadvisorFundResponseSchema =
  CreateBankAccountRoboadvisorFundResponseSchema;

export type UpdateBankAccountRoboadvisorFundResponse = z.infer<
  typeof UpdateBankAccountRoboadvisorFundResponseSchema
>;

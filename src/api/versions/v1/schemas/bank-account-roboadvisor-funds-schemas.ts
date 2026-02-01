import { z } from "@hono/zod-openapi";

// Roboadvisor Fund schemas
export const CreateBankAccountRoboadvisorFundRequestSchema = z.object({
  bankAccountRoboadvisorId: z
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
  weight: z
    .string()
    .regex(/^(1(\.0{1,5})?|0(\.\d{1,5})?)$/)
    .openapi({ example: "0.39" })
    .describe("Fund weight as decimal (0.39 = 39%)"),
});

export type CreateBankAccountRoboadvisorFundRequest = z.infer<
  typeof CreateBankAccountRoboadvisorFundRequestSchema
>;

export const CreateBankAccountRoboadvisorFundResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Vanguard FTSE All-World UCITS ETF" }),
  isin: z.string().openapi({ example: "IE00BK5BQT80" }),
  assetClass: z.string().openapi({ example: "equity" }),
  region: z.string().openapi({ example: "Global" }),
  fundCurrencyCode: z.string().openapi({ example: "USD" }),
  weight: z.string().openapi({ example: "0.39" }),
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

export const BankAccountRoboadvisorFundSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Vanguard FTSE All-World UCITS ETF" }),
  isin: z.string().openapi({ example: "IE00BK5BQT80" }),
  assetClass: z.string().openapi({ example: "equity" }),
  region: z.string().openapi({ example: "Global" }),
  fundCurrencyCode: z.string().openapi({ example: "USD" }),
  weight: z.string().openapi({ example: "0.39" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountRoboadvisorFundsResponseSchema = z.object({
  results: z
    .array(BankAccountRoboadvisorFundSummarySchema)
    .describe("List of roboadvisor funds"),
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
  weight: z
    .string()
    .regex(/^(1(\.0{1,5})?|0(\.\d{1,5})?)$/)
    .optional()
    .openapi({ example: "0.39" })
    .describe("Fund weight as decimal (0.39 = 39%)"),
});

export type UpdateBankAccountRoboadvisorFundRequest = z.infer<
  typeof UpdateBankAccountRoboadvisorFundRequestSchema
>;

export const UpdateBankAccountRoboadvisorFundResponseSchema =
  CreateBankAccountRoboadvisorFundResponseSchema;

export type UpdateBankAccountRoboadvisorFundResponse = z.infer<
  typeof UpdateBankAccountRoboadvisorFundResponseSchema
>;

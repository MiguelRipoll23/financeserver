import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

// Crypto Exchange Balance schemas
export const CreateCryptoExchangeBalanceRequestSchema = z.object({
  cryptoExchangeId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Crypto exchange identifier"),
  balance: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,8})?$/)
    .openapi({ example: "1.23456789" })
    .describe("Current balance amount"),
  symbolCode: z
    .string()
    .min(1)
    .max(10)
    .openapi({ example: "BTC" })
    .describe("Asset symbol (e.g., BTC, ETH)"),
  investedAmount: MonetaryStringSchema.optional().describe(
    "Amount originally invested"
  ),
  investedCurrencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code of the invested amount"),
});

export type CreateCryptoExchangeBalanceRequest = z.infer<
  typeof CreateCryptoExchangeBalanceRequestSchema
>;

export const CreateCryptoExchangeBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cryptoExchangeId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1.23456789" }),
  symbolCode: z.string().openapi({ example: "BTC" }),
  investedAmount: z.string().nullable().openapi({ example: "50000.00" }),
  investedCurrencyCode: z.string().nullable().openapi({ example: "USD" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateCryptoExchangeBalanceResponse = z.infer<
  typeof CreateCryptoExchangeBalanceResponseSchema
>;

export const CryptoExchangeBalanceIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type CryptoExchangeBalanceIdParam = z.infer<
  typeof CryptoExchangeBalanceIdParamSchema
>;

export const GetCryptoExchangeBalancesRequestSchema =
  PaginationQuerySchema.extend({
    cryptoExchangeId: z
      .number()
      .int()
      .openapi({ example: 1, type: "integer" })
      .describe("Crypto exchange identifier"),
    sortOrder: z
      .nativeEnum(SortOrder)
      .optional()
      .openapi({ example: SortOrder.Desc }),
  });

export type GetCryptoExchangeBalancesRequest = z.infer<
  typeof GetCryptoExchangeBalancesRequestSchema
>;

export const CryptoExchangeBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  cryptoExchangeId: z.number().int().openapi({ example: 1 }),
  balance: z.string().openapi({ example: "1.23456789" }),
  symbolCode: z.string().openapi({ example: "BTC" }),
  investedAmount: z.string().nullable().openapi({ example: "50000.00" }),
  investedCurrencyCode: z.string().nullable().openapi({ example: "USD" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetCryptoExchangeBalancesResponseSchema = z.object({
  data: z.array(CryptoExchangeBalanceSummarySchema),
  nextCursor: z.string().nullable(),
});

export type GetCryptoExchangeBalancesResponse = z.infer<
  typeof GetCryptoExchangeBalancesResponseSchema
>;

export const UpdateCryptoExchangeBalanceRequestSchema = z.object({
  balance: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,8})?$/)
    .optional()
    .openapi({ example: "1.23456789" })
    .describe("Current balance amount"),
  symbolCode: z
    .string()
    .min(1)
    .max(10)
    .optional()
    .openapi({ example: "BTC" })
    .describe("Asset symbol (e.g., BTC, ETH)"),
  investedAmount: MonetaryStringSchema.optional().describe(
    "Amount originally invested"
  ),
  investedCurrencyCode: z
    .string()
    .length(3)
    .optional()
    .openapi({ example: "USD" })
    .describe("ISO 4217 currency code of the invested amount"),
});

export type UpdateCryptoExchangeBalanceRequest = z.infer<
  typeof UpdateCryptoExchangeBalanceRequestSchema
>;

export const UpdateCryptoExchangeBalanceResponseSchema =
  CreateCryptoExchangeBalanceResponseSchema;

export type UpdateCryptoExchangeBalanceResponse = z.infer<
  typeof UpdateCryptoExchangeBalanceResponseSchema
>;

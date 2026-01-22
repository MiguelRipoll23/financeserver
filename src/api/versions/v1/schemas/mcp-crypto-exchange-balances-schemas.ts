import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const CryptoBalanceRegex = /^[0-9]+(\.[0-9]{1,8})?$/;

// Crypto Exchange Balance Tool Schemas
export const CreateCryptoExchangeBalanceToolSchema = z.object({
  cryptoExchangeId: z
    .number()
    .int()
    .positive()
    .describe("ID of the crypto exchange"),
  balance: z
    .string()
    .regex(
      CryptoBalanceRegex,
      "Balance must be a valid crypto balance value (up to 8 decimal places, format: 1.23456789, no symbol, dot as decimal separator)"
    )
    .describe("The current balance (format: 1.23456789, no symbol)"),
  symbolCode: z
    .string()
    .min(1)
    .max(10)
    .describe("Asset symbol (e.g., BTC, ETH)"),
  investedAmount: z
    .string()
    .regex(
      MonetaryRegex,
      "Invested amount must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .optional()
    .describe("The amount originally invested (format: 123.45, optional)"),
  investedCurrencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .optional()
    .describe("ISO 4217 currency code of the invested amount (e.g., EUR, USD)"),
});

export const FilterCryptoExchangeBalancesToolSchema = z.object({
  cryptoExchangeId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("ID of the crypto exchange to get balances for (optional - if not provided, returns all balances)"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (default: 10, max: 100)"),
  cursor: z
    .string()
    .optional()
    .describe("Cursor for pagination (from nextCursor in previous response)"),
});

export const DeleteCryptoExchangeBalanceToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the balance record to delete"),
});

export const UpdateCryptoExchangeBalanceToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the balance record to update"),
  balance: z
    .string()
    .regex(
      CryptoBalanceRegex,
      "Balance must be a valid crypto balance value (up to 8 decimal places, format: 1.23456789, no symbol, dot as decimal separator)"
    )
    .optional()
    .describe("The updated balance (format: 1.23456789, no symbol)"),
  symbolCode: z
    .string()
    .min(1)
    .max(10)
    .optional()
    .describe("Asset symbol (e.g., BTC, ETH)"),
  investedAmount: z
    .string()
    .regex(
      MonetaryRegex,
      "Invested amount must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .nullable()
    .optional()
    .describe("The amount originally invested (format: 123.45, optional)"),
  investedCurrencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .nullable()
    .optional()
    .describe("ISO 4217 currency code of the invested amount (e.g., EUR, USD)"),
});

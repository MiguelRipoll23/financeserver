import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountBalanceSortField } from "../enums/bank-account-balance-sort-field-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const PercentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

// Bank Account Balance Tool Schemas
export const CreateBankAccountBalanceToolSchema = z.object({
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  balance: z
    .string()
    .regex(
      MonetaryRegex,
      "Balance must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe("The current balance (format: 123.45, no currency symbol)"),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
});

export const FilterBankAccountBalancesToolSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .positive()
    .describe("ID of the bank account to get balances for"),
  sortField: z
    .nativeEnum(BankAccountBalanceSortField)
    .optional()
    .describe("Sort field (default: created_at)"),
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

export const DeleteBalanceToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the balance record to delete"),
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
});

export const UpdateBalanceToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the balance record to update"),
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  balance: z
    .string()
    .regex(
      MonetaryRegex,
      "Balance must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .optional()
    .describe("The updated balance (format: 123.45, no currency symbol)"),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .optional()
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
});

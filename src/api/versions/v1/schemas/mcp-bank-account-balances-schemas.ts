import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const PercentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

// Bank Account Balance Tool Schemas
export const CreateBankAccountBalanceToolSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .positive()
    .describe("ID of the bank account"),
  balance: z
    .string()
    .regex(
      MonetaryRegex,
      "Balance must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe("The current balance (format: 123.45, no currency symbol)"),
  currencySymbol: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  interestRate: z
    .string()
    .regex(
      PercentageRegex,
      "Interest rate must be a valid percentage (format: 2.50 for 2.50%)"
    )
    .optional()
    .describe("Interest rate percentage (format: 2.50 for 2.50%, optional)"),
  interestRateStartDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .optional()
    .describe("Start date of interest rate period (format: YYYY-MM-DD, optional)"),
  interestRateEndDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .optional()
    .describe("End date of interest rate period (format: YYYY-MM-DD, optional)"),
});

export const FilterBankAccountBalancesToolSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .positive()
    .describe("ID of the bank account to get balances for"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (default: 20, max: 100)"),
  cursor: z
    .string()
    .optional()
    .describe("Cursor for pagination (from nextCursor in previous response)"),
});

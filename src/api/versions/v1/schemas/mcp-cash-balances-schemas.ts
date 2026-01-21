import { z } from "zod";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";
import { CashBalanceSortField } from "../enums/cash-balance-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

export const CreateCashBalanceToolSchema = z.object({
  cashId: z.number().int().positive().describe("Cash source identifier"),
  balance: MonetaryStringSchema.describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .describe("ISO 4217 currency code"),
});

export const UpdateCashBalanceToolSchema = z.object({
  id: z.number().int().positive().describe("Cash balance identifier"),
  balance: MonetaryStringSchema.optional().describe("Current balance amount"),
  currencyCode: z
    .string()
    .length(3)
    .optional()
    .describe("ISO 4217 currency code"),
});

export const DeleteCashBalanceToolSchema = z.object({
  id: z.number().int().positive().describe("Cash balance identifier"),
});

export const FilterCashBalancesToolSchema = PaginationQuerySchema.extend({
  cashId: z.number().int().positive().describe("Cash source identifier"),
  sortField: z
    .nativeEnum(CashBalanceSortField)
    .optional()
    .describe("Sort field"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order"),
});

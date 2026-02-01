import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorBalanceSortField } from "../enums/bank-account-roboadvisor-balance-sort-field-enum.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
const DateRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

// Roboadvisor Balance Tool Schemas
export const CreateBankAccountRoboadvisorBalanceToolSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .positive()
    .describe("ID of the roboadvisor"),
  date: z
    .string()
    .regex(DateRegex, "Date must be in YYYY-MM-DD format")
    .describe("Transaction date (YYYY-MM-DD)"),
  type: z
    .enum(["deposit", "withdrawal", "adjustment"])
    .describe("Transaction type: deposit, withdrawal, or adjustment"),
  amount: z
    .string()
    .regex(MonetaryRegex, "Amount must be a valid monetary value (e.g., 1000.00)")
    .describe("Transaction amount (e.g., 1000.00)"),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .describe("ISO 4217 currency code (e.g., EUR, USD)"),
});

export const FilterBankAccountRoboadvisorBalancesToolSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by roboadvisor ID (optional)"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorBalanceSortField)
    .optional()
    .describe("Sort field (default: date)"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order (default: desc)"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (default: 10, max: 100)"),
  cursor: z.string().optional().describe("Cursor for pagination"),
});

export const UpdateBankAccountRoboadvisorBalanceToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the balance record to update"),
  date: z
    .string()
    .regex(DateRegex, "Date must be in YYYY-MM-DD format")
    .optional()
    .describe("Transaction date (YYYY-MM-DD)"),
  type: z
    .enum(["deposit", "withdrawal", "adjustment"])
    .optional()
    .describe("Transaction type: deposit, withdrawal, or adjustment"),
  amount: z
    .string()
    .regex(MonetaryRegex, "Amount must be a valid monetary value (e.g., 1000.00)")
    .optional()
    .describe("Transaction amount (e.g., 1000.00)"),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .optional()
    .describe("ISO 4217 currency code (e.g., EUR, USD)"),
});

export const DeleteBankAccountRoboadvisorBalanceToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the balance record to delete"),
});

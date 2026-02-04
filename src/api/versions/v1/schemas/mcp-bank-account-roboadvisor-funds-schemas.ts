import { z } from "zod";
import { BankAccountRoboadvisorFundSortField } from "../enums/bank-account-roboadvisor-fund-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Roboadvisor Fund Tool Schemas
export const CreateBankAccountRoboadvisorFundToolSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .positive()
    .describe("ID of the roboadvisor"),
  name: z.string().min(1).max(255).describe("Fund name"),
  isin: z
    .string()
    .length(12, "ISIN must be exactly 12 characters")
    .describe("ISIN code (12 characters, e.g., IE00BK5BQT80)"),
  assetClass: z.string().min(1).max(50).describe("Asset class (e.g., equity, bonds)"),
  region: z.string().min(1).max(50).describe("Region (e.g., US, Europe, EM, Global)"),
  fundCurrencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .describe("Fund currency ISO 4217 code (e.g., USD, EUR)"),
  weight: z
    .number()
    .min(0)
    .max(1)
    .describe("Fund weight as decimal (0.39 = 39%)"),
  shareCount: z
    .number()
    .positive()
    .optional()
    .describe("Number of shares/units held (can be fractional, e.g., 125.5)"),
});

export const FilterBankAccountRoboadvisorFundsToolSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .positive()
    .describe("ID of the roboadvisor to get funds for"),
  name: z
    .string()
    .optional()
    .describe("Filter by fund name (partial match)"),
  isin: z
    .string()
    .optional()
    .describe("Filter by ISIN code"),
  assetClass: z
    .string()
    .optional()
    .describe("Filter by asset class"),
  region: z
    .string()
    .optional()
    .describe("Filter by region"),
  fundCurrencyCode: z
    .string()
    .length(3)
    .optional()
    .describe("Filter by fund currency code"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorFundSortField)
    .optional()
    .describe("Sort field (default: name)"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Sort order (default: asc)"),
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
    .describe("Cursor for pagination"),
});

export const UpdateBankAccountRoboadvisorFundToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the fund to update"),
  name: z.string().min(1).max(255).optional().describe("Fund name"),
  isin: z
    .string()
    .length(12, "ISIN must be exactly 12 characters")
    .optional()
    .describe("ISIN code (12 characters, e.g., IE00BK5BQT80)"),
  assetClass: z.string().min(1).max(50).optional().describe("Asset class (e.g., equity, bonds)"),
  region: z.string().min(1).max(50).optional().describe("Region (e.g., US, Europe, EM, Global)"),
  fundCurrencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .optional()
    .describe("Fund currency ISO 4217 code (e.g., USD, EUR)"),
  weight: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Fund weight as decimal (0.39 = 39%)"),
  shareCount: z
    .number()
    .positive()
    .optional()
    .describe("Number of shares/units held (can be fractional, e.g., 125.5)"),
});

export const DeleteBankAccountRoboadvisorFundToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the fund to delete"),
});

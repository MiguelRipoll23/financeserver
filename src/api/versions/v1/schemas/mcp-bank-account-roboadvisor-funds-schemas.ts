import { z } from "zod";

const DecimalRegex = /^[0-9]+(\.[0-9]{1,5})?$/;

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
    .string()
    .regex(DecimalRegex, "Weight must be a decimal (e.g., 0.39 for 39%)")
    .describe("Fund weight as decimal (e.g., 0.39 = 39%)"),
});

export const FilterBankAccountRoboadvisorFundsToolSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .positive()
    .describe("ID of the roboadvisor to get funds for"),
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
    .string()
    .regex(DecimalRegex, "Weight must be a decimal (e.g., 0.39 for 39%)")
    .optional()
    .describe("Fund weight as decimal (e.g., 0.39 = 39%)"),
});

export const DeleteBankAccountRoboadvisorFundToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the fund to delete"),
});

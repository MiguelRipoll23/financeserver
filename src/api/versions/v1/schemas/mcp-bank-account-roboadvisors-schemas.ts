import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorSortField } from "../enums/bank-account-roboadvisor-sort-field-enum.ts";

// Roboadvisor Tool Schemas
export const CreateBankAccountRoboadvisorToolSchema = z.object({
  name: z.string().min(1).max(255).describe("Name of the roboadvisor"),
  bankAccountId: z
    .number()
    .int()
    .positive()
    .describe("ID of the associated bank account"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(7)
    .optional()
    .describe("Risk level from 1 (conservative) to 7 (aggressive)"),
  managementFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .describe("Annual management fee as decimal (e.g., 0.0015 = 0.15%)"),
  custodyFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .describe("Annual custody fee as decimal (e.g., 0.0015 = 0.15%)"),
  fundTerPercentage: z
    .number()
    .min(0)
    .max(1)
    .describe("Fund TER as decimal (e.g., 0.0010 = 0.10%)"),
  totalFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .describe("Total annual fee as decimal (e.g., 0.0040 = 0.40%)"),
  managementFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .describe("Management fee billing frequency"),
  custodyFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .describe("Custody fee billing frequency"),
  terPricedInNav: z
    .boolean()
    .optional()
    .describe("Whether TER is priced in NAV (default: true)"),
  taxPercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Tax percentage as decimal (0.26 = 26%)"),
});

export const FilterBankAccountRoboadvisorsToolSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by bank account ID (optional)"),
  name: z
    .string()
    .optional()
    .describe("Filter by roboadvisor name (partial match)"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorSortField)
    .optional()
    .describe("Sort field (default: created_at)"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Sort order (default: desc)"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (default: 10, max: 100)"),
  cursor: z.string().optional().describe("Cursor for pagination"),
});

export const UpdateBankAccountRoboadvisorToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the roboadvisor to update"),
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Name of the roboadvisor"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(7)
    .optional()
    .describe("Risk level from 1 (conservative) to 7 (aggressive)"),
  managementFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Annual management fee as decimal (e.g., 0.0015 = 0.15%)"),
  custodyFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Annual custody fee as decimal (e.g., 0.0015 = 0.15%)"),
  fundTerPercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Fund TER as decimal (e.g., 0.0010 = 0.10%)"),
  totalFeePercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Total annual fee as decimal (e.g., 0.0040 = 0.40%)"),
  managementFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .optional()
    .describe("Management fee billing frequency"),
  custodyFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .optional()
    .describe("Custody fee billing frequency"),
  terPricedInNav: z
    .boolean()
    .optional()
    .describe("Whether TER is priced in NAV"),
  taxPercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Tax percentage as decimal (0.26 = 26%)"),
});

export const DeleteBankAccountRoboadvisorToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the roboadvisor to delete"),
});

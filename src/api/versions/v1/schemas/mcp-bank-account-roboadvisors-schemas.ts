import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorSortField } from "../enums/bank-account-roboadvisor-sort-field-enum.ts";

const DecimalRegex = /^[0-9]+(\.[0-9]{1,5})?$/;

// Roboadvisor Tool Schemas
export const CreateBankAccountRoboadvisorToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe("Name of the roboadvisor portfolio"),
  bankAccountId: z
    .number()
    .int()
    .positive()
    .describe("ID of the associated bank account"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Risk level from 1 (conservative) to 10 (aggressive)"),
  managementFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0015 for 0.15%)")
    .describe("Annual management fee as decimal (e.g., 0.0015 = 0.15%)"),
  custodyFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0015 for 0.15%)")
    .describe("Annual custody fee as decimal (e.g., 0.0015 = 0.15%)"),
  fundTotalExpenseRatioPercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0010 for 0.10%)")
    .describe("Fund TER as decimal (e.g., 0.0010 = 0.10%)"),
  totalFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0040 for 0.40%)")
    .describe("Total annual fee as decimal (e.g., 0.0040 = 0.40%)"),
  managementFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .describe("Management fee billing frequency"),
  custodyFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .describe("Custody fee billing frequency"),
  totalExpenseRatioPricedInNav: z
    .boolean()
    .optional()
    .describe("Whether TER is priced in NAV (default: true)"),
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
    .describe("Name of the roboadvisor portfolio"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Risk level from 1 (conservative) to 10 (aggressive)"),
  managementFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0015 for 0.15%)")
    .optional()
    .describe("Annual management fee as decimal (e.g., 0.0015 = 0.15%)"),
  custodyFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0015 for 0.15%)")
    .optional()
    .describe("Annual custody fee as decimal (e.g., 0.0015 = 0.15%)"),
  fundTotalExpenseRatioPercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0010 for 0.10%)")
    .optional()
    .describe("Fund TER as decimal (e.g., 0.0010 = 0.10%)"),
  totalFeePercentage: z
    .string()
    .regex(DecimalRegex, "Must be a decimal (e.g., 0.0040 for 0.40%)")
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
  totalExpenseRatioPricedInNav: z
    .boolean()
    .optional()
    .describe("Whether TER is priced in NAV"),
});

export const DeleteBankAccountRoboadvisorToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the roboadvisor to delete"),
});

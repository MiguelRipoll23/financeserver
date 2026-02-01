import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorSortField } from "../enums/bank-account-roboadvisor-sort-field-enum.ts";

// Roboadvisor schemas
export const CreateBankAccountRoboadvisorRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "My Roboadvisor Portfolio" })
    .describe("Name of the roboadvisor portfolio"),
  bankAccountId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Associated bank account identifier"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .openapi({ example: 5 })
    .describe("Risk level (1-10 scale)"),
  managementFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .openapi({ example: "0.0015" })
    .describe("Annual management fee as decimal (0.0015 = 0.15%)"),
  custodyFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .openapi({ example: "0.0015" })
    .describe("Annual custody fee as decimal (0.0015 = 0.15%)"),
  fundTerPct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .openapi({ example: "0.0010" })
    .describe("Fund TER as decimal (0.0010 = 0.10%)"),
  totalFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .openapi({ example: "0.0040" })
    .describe("Total annual fee as decimal (0.0040 = 0.40%)"),
  managementFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .openapi({ example: "monthly" })
    .describe("Management fee billing frequency"),
  custodyFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .openapi({ example: "quarterly" })
    .describe("Custody fee billing frequency"),
  terPricedInNav: z
    .boolean()
    .default(true)
    .openapi({ example: true })
    .describe("Whether TER is priced in NAV"),
});

export type CreateBankAccountRoboadvisorRequest = z.infer<
  typeof CreateBankAccountRoboadvisorRequestSchema
>;

export const CreateBankAccountRoboadvisorResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "My Roboadvisor Portfolio" }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  riskLevel: z.number().int().nullable().openapi({ example: 5 }),
  managementFeePct: z.string().openapi({ example: "0.0015" }),
  custodyFeePct: z.string().openapi({ example: "0.0015" }),
  fundTerPct: z.string().openapi({ example: "0.0010" }),
  totalFeePct: z.string().openapi({ example: "0.0040" }),
  managementFeeFrequency: z.string().openapi({ example: "monthly" }),
  custodyFeeFrequency: z.string().openapi({ example: "quarterly" }),
  terPricedInNav: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountRoboadvisorResponse = z.infer<
  typeof CreateBankAccountRoboadvisorResponseSchema
>;

export const BankAccountRoboadvisorIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountRoboadvisorIdParam = z.infer<
  typeof BankAccountRoboadvisorIdParamSchema
>;

export const GetBankAccountRoboadvisorsRequestSchema = PaginationQuerySchema.extend({
  bankAccountId: z
    .number()
    .int()
    .optional()
    .openapi({ example: 1, type: "integer" })
    .describe("Bank account identifier (optional)"),
  name: z
    .string()
    .optional()
    .openapi({ example: "My Portfolio" })
    .describe("Filter by roboadvisor name"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorSortField)
    .optional()
    .openapi({ example: BankAccountRoboadvisorSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
});

export type GetBankAccountRoboadvisorsRequest = z.infer<
  typeof GetBankAccountRoboadvisorsRequestSchema
>;

export const BankAccountRoboadvisorSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "My Roboadvisor Portfolio" }),
  bankAccountId: z.number().int().openapi({ example: 1 }),
  riskLevel: z.number().int().nullable().openapi({ example: 5 }),
  managementFeePct: z.string().openapi({ example: "0.0015" }),
  custodyFeePct: z.string().openapi({ example: "0.0015" }),
  fundTerPct: z.string().openapi({ example: "0.0010" }),
  totalFeePct: z.string().openapi({ example: "0.0040" }),
  managementFeeFrequency: z.string().openapi({ example: "monthly" }),
  custodyFeeFrequency: z.string().openapi({ example: "quarterly" }),
  terPricedInNav: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountRoboadvisorsResponseSchema = z.object({
  results: z
    .array(BankAccountRoboadvisorSummarySchema)
    .describe("List of roboadvisor summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z.number().int().describe("Total number of roboadvisors matching the query"),
  nextCursor: z.string().nullable().describe("Cursor for the next page of results or null"),
  previousCursor: z.string().nullable().describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountRoboadvisorsResponse = z.infer<
  typeof GetBankAccountRoboadvisorsResponseSchema
>;

export const UpdateBankAccountRoboadvisorRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .openapi({ example: "My Roboadvisor Portfolio" })
    .describe("Name of the roboadvisor portfolio"),
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .openapi({ example: 5 })
    .describe("Risk level (1-10 scale)"),
  managementFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .optional()
    .openapi({ example: "0.0015" })
    .describe("Annual management fee as decimal (0.0015 = 0.15%)"),
  custodyFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .optional()
    .openapi({ example: "0.0015" })
    .describe("Annual custody fee as decimal (0.0015 = 0.15%)"),
  fundTerPct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .optional()
    .openapi({ example: "0.0010" })
    .describe("Fund TER as decimal (0.0010 = 0.10%)"),
  totalFeePct: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,5})?$/)
    .optional()
    .openapi({ example: "0.0040" })
    .describe("Total annual fee as decimal (0.0040 = 0.40%)"),
  managementFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .optional()
    .openapi({ example: "monthly" })
    .describe("Management fee billing frequency"),
  custodyFeeFrequency: z
    .enum(["monthly", "quarterly", "yearly"])
    .optional()
    .openapi({ example: "quarterly" })
    .describe("Custody fee billing frequency"),
  terPricedInNav: z
    .boolean()
    .optional()
    .openapi({ example: true })
    .describe("Whether TER is priced in NAV"),
});

export type UpdateBankAccountRoboadvisorRequest = z.infer<
  typeof UpdateBankAccountRoboadvisorRequestSchema
>;

export const UpdateBankAccountRoboadvisorResponseSchema =
  CreateBankAccountRoboadvisorResponseSchema;

export type UpdateBankAccountRoboadvisorResponse = z.infer<
  typeof UpdateBankAccountRoboadvisorResponseSchema
>;

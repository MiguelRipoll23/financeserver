import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const CreateBankAccountInterestRateToolSchema = z.object({
  bankAccountId: z.number().int().positive().describe("ID of the bank account"),
  interestRate: z
    .number()
    .min(0)
    .max(1)
    .describe("Interest rate as decimal (0.025 = 2.5%)"),
  interestRateStartDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .describe(
      "Start date of interest rate period (format: YYYY-MM-DD)"
    ),
  interestRateEndDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .nullable()
    .optional()
    .describe(
      "End date of interest rate period (format: YYYY-MM-DD, optional)"
    ),
});

export const FilterBankAccountInterestRatesToolSchema = z.object({
  bankAccountId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("ID of the bank account to get interest rates for"),
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

export const DeleteBankAccountInterestRateToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the interest rate record to delete"),
});

export const UpdateBankAccountInterestRateToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the interest rate record to update"),
  interestRate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Interest rate as decimal (0.025 = 2.5%, optional)"),
  interestRateStartDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .optional()
    .describe(
      "Start date of interest rate period (format: YYYY-MM-DD, optional)"
    ),
  interestRateEndDate: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .nullable()
    .optional()
    .describe(
      "End date of interest rate period (format: YYYY-MM-DD, optional)"
    ),
});

import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { BankAccountRoboadvisorBalanceSortField } from "../enums/bank-account-roboadvisor-balance-sort-field-enum.ts";

// Helper function to validate date string is a real calendar date
function isValidDateString(dateString: string): boolean {
  const regex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
  const match = dateString.match(regex);

  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Check month range
  if (month < 1 || month > 12) return false;

  // Check day range for each month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Adjust for leap year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear) {
    daysInMonth[1] = 29;
  }

  if (day < 1 || day > daysInMonth[month - 1]) return false;

  return true;
}

// Roboadvisor Balance schemas
export const CreateBankAccountRoboadvisorBalanceRequestSchema = z.object({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Associated roboadvisor identifier"),
  date: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .refine((value) => isValidDateString(value), {
      message: "Invalid calendar date. Please provide a valid date in YYYY-MM-DD format (e.g., 2026-01-15).",
    })
    .openapi({ example: "2026-01-15" })
    .describe("Transaction date (YYYY-MM-DD)"),
  type: z
    .enum(["deposit", "withdrawal", "adjustment"])
    .openapi({ example: "deposit" })
    .describe("Transaction type"),
  amount: z
    .string()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
    .openapi({ example: "1000.00" })
    .describe("Transaction amount"),
  currencyCode: z
    .string()
    .length(3)
    .openapi({ example: "EUR" })
    .describe("ISO 4217 currency code"),
});

export type CreateBankAccountRoboadvisorBalanceRequest = z.infer<
  typeof CreateBankAccountRoboadvisorBalanceRequestSchema
>;

export const CreateBankAccountRoboadvisorBalanceResponseSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  date: z.string().openapi({ example: "2026-01-15" }),
  type: z.string().openapi({ example: "deposit" }),
  amount: z.string().openapi({ example: "1000.00" }),
  currencyCode: z.string().openapi({ example: "EUR" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountRoboadvisorBalanceResponse = z.infer<
  typeof CreateBankAccountRoboadvisorBalanceResponseSchema
>;

export const BankAccountRoboadvisorBalanceIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountRoboadvisorBalanceIdParam = z.infer<
  typeof BankAccountRoboadvisorBalanceIdParamSchema
>;

export const GetBankAccountRoboadvisorBalancesRequestSchema = PaginationQuerySchema.extend({
  bankAccountRoboadvisorId: z
    .number()
    .int()
    .optional()
    .openapi({ example: 1, type: "integer" })
    .describe("Roboadvisor identifier (optional)"),
  sortField: z
    .nativeEnum(BankAccountRoboadvisorBalanceSortField)
    .optional()
    .openapi({ example: BankAccountRoboadvisorBalanceSortField.Date }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
});

export type GetBankAccountRoboadvisorBalancesRequest = z.infer<
  typeof GetBankAccountRoboadvisorBalancesRequestSchema
>;

export const BankAccountRoboadvisorBalanceSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  bankAccountRoboadvisorId: z.number().int().openapi({ example: 1 }),
  date: z.string().openapi({ example: "2026-01-15" }),
  type: z.string().openapi({ example: "deposit" }),
  amount: z.string().openapi({ example: "1000.00" }),
  currencyCode: z.string().openapi({ example: "EUR" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountRoboadvisorBalancesResponseSchema = z.object({
  results: z
    .array(BankAccountRoboadvisorBalanceSummarySchema)
    .describe("List of roboadvisor balance records"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z.number().int().describe("Total number of balance records matching the query"),
  nextCursor: z.string().nullable().describe("Cursor for the next page of results or null"),
  previousCursor: z.string().nullable().describe("Cursor for the previous page of results or null"),
});

export type GetBankAccountRoboadvisorBalancesResponse = z.infer<
  typeof GetBankAccountRoboadvisorBalancesResponseSchema
>;

export const UpdateBankAccountRoboadvisorBalanceRequestSchema = z
  .object({
    date: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
      .refine((value) => isValidDateString(value), {
        message: "Invalid calendar date. Please provide a valid date in YYYY-MM-DD format (e.g., 2026-01-15).",
      })
      .optional()
      .openapi({ example: "2026-01-15" })
      .describe("Transaction date (YYYY-MM-DD)"),
    type: z
      .enum(["deposit", "withdrawal", "adjustment"])
      .optional()
      .openapi({ example: "deposit" })
      .describe("Transaction type"),
    amount: z
      .string()
      .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
      .optional()
      .openapi({ example: "1000.00" })
      .describe("Transaction amount"),
    currencyCode: z
      .string()
      .length(3)
      .optional()
      .openapi({ example: "EUR" })
      .describe("ISO 4217 currency code"),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateBankAccountRoboadvisorBalanceRequest = z.infer<
  typeof UpdateBankAccountRoboadvisorBalanceRequestSchema
>;

export const UpdateBankAccountRoboadvisorBalanceResponseSchema =
  CreateBankAccountRoboadvisorBalanceResponseSchema;

export type UpdateBankAccountRoboadvisorBalanceResponse = z.infer<
  typeof UpdateBankAccountRoboadvisorBalanceResponseSchema
>;

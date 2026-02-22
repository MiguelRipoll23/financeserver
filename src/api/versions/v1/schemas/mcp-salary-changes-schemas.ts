import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { SalaryChangeSortField } from "../enums/salary-change-sort-field-enum.ts";
import { Recurrence } from "../enums/recurrence-enum.ts";

const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

export const CreateSalaryChangeToolSchema = z.object({
  recurrence: z
    .nativeEnum(Recurrence)
    .describe(
      "Recurrence of the salary change (weekly, bi-weekly, monthly, yearly)",
    ),
  netAmount: z
    .string()
    .regex(
      MonetaryRegex,
      "Net amount must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)",
    )
    .describe(
      "The net amount of the salary change (format: 123.45, no currency symbol)",
    ),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
});

export const UpdateSalaryChangeToolSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .describe("ID of the salary change to update"),
  })
  .merge(CreateSalaryChangeToolSchema.partial())
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteSalaryChangeToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the salary change to delete"),
});

export const ListSalaryChangesToolSchema = z.object({
  recurrence: z
    .nativeEnum(Recurrence)
    .optional()
    .describe("Filter salary changes by recurrence"),
  minimumNetAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Minimum net amount for salary changes (format: 123.45, no currency symbol)",
    ),
  maximumNetAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Maximum net amount for salary changes (format: 123.45, no currency symbol)",
    ),
  sortField: z
    .nativeEnum(SalaryChangeSortField)
    .optional()
    .describe("Field to sort salary changes by"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Order to sort results (ascending or descending)"),
  limit: z.coerce
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .describe("Maximum number of salary changes to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

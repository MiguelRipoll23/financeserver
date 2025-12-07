import { z } from "zod";
import { BillSortField } from "../enums/bill-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

export const SaveBillToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "ID of existing bill to update (optional, if not provided a new bill will be created based on date)"
    ),
  date: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .describe("The date when the bill was issued or due (format: YYYY-MM-DD)"),
  category: z
    .string()
    .min(1)
    .max(128, "Category must be between 1-128 characters")
    .describe(
      "The category of the bill in English (e.g., utilities, rent, insurance)"
    ),
  totalAmount: z
    .string()
    .regex(
      MonetaryRegex,
      "Total amount must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe(
      "The total amount of the bill (format: 123.45, no currency symbol)"
    ),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  senderEmail: z
    .string()
    .email("Sender email must be a valid email address")
    .optional()
    .describe(
      "Email address of the bill sender or service provider (optional)"
    ),
});

export const FilterBillsToolSchema = z.object({
  startDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe("Filter bills from this date onwards (format: YYYY-MM-DD)"),
  endDate: z
    .string()
    .regex(DateOnlyRegex)
    .optional()
    .describe("Filter bills up to this date (format: YYYY-MM-DD)"),
  category: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe("Filter bills by category in English (exact match)"),
  minimumTotalAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Minimum total amount for bills (format: 123.45, no currency symbol)"
    ),
  maximumTotalAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Maximum total amount for bills (format: 123.45, no currency symbol)"
    ),
  sortField: z
    .nativeEnum(BillSortField)
    .optional()
    .describe("Field to sort bills by"),
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
    .describe("Maximum number of bills to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

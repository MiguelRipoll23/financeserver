import { z } from "zod";
import { ReceiptSortField } from "../enums/receipt-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const DateOnlyRegex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MonetaryRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

const SaveReceiptSubitemToolSchema = z.object({
  name: z
    .string()
    .min(1, "Subitem name must not be empty")
    .max(256, "Subitem name must be 256 characters or less")
    .transform((val) => val.trim())
    .describe("The name or description of the subitem"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .gte(1, "Quantity must be positive")
    .describe("The number of units purchased of this subitem"),
  unitPrice: z
    .string()
    .regex(
      MonetaryRegex,
      "Unit price must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe(
      "The price per unit for this subitem (format: 123.45, no currency symbol)"
    ),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
});

export const SaveReceiptItemToolSchema = z.object({
  name: z
    .string()
    .min(1, "Item name must not be empty")
    .max(256, "Item name must be 256 characters or less")
    .transform((val) => val.trim())
    .describe("The name or description of the purchased item"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .gte(1, "Quantity must be positive")
    .describe("The number of units purchased of this item"),
  unitPrice: z
    .string()
    .regex(
      MonetaryRegex,
      "Unit price must be a valid monetary value (format: 123.45, no currency symbol, dot as decimal separator)"
    )
    .describe(
      "The price per unit for this item (format: 123.45, no currency symbol)"
    ),
  currencyCode: z
    .string()
    .length(3, "Currency code must be exactly 3 characters (ISO 4217 format)")
    .describe("ISO 4217 currency code (e.g., EUR, USD, GBP)"),
  items: z
    .array(SaveReceiptSubitemToolSchema)
    .optional()
    .describe("Optional list of subitems associated with this item (nesting limited to 1 level)"),
});

export const SaveReceiptToolSchema = z.object({
  date: z
    .string()
    .regex(DateOnlyRegex, "Date must be in YYYY-MM-DD format")
    .describe("The date when the receipt was issued (format: YYYY-MM-DD)"),
  items: z
    .array(SaveReceiptItemToolSchema)
    .min(1, "At least one item is required")
    .describe("List of items purchased on this receipt"),
});

export const UpdateReceiptToolSchema = z
  .object({
    id: z.number().int().positive().describe("ID of the receipt to update"),
  })
  .merge(SaveReceiptToolSchema.partial())
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteReceiptToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the receipt to delete"),
});

export const FilterReceiptsToolSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Filter receipts from this date onwards (format: YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .describe("Filter receipts up to this date (format: YYYY-MM-DD)"),
  minimumTotalAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Minimum total amount for receipts (format: 123.45, no currency symbol)"
    ),
  maximumTotalAmount: z
    .string()
    .regex(MonetaryRegex)
    .optional()
    .describe(
      "Maximum total amount for receipts (format: 123.45, no currency symbol)"
    ),
  productName: z
    .string()
    .optional()
    .describe(
      "Filter receipts containing items with this name (partial match)"
    ),
  sortField: z
    .nativeEnum(ReceiptSortField)
    .optional()
    .describe("Field to sort receipts by"),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .describe("Order to sort results (ascending or descending)"),
  limit: z
    .number()
    .int()
    .gte(1)
    .max(100)
    .optional()
    .describe("Maximum number of receipts to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

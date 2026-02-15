import { z } from "@hono/zod-openapi";
import { ReceiptSortField } from "../enums/receipt-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { DateOnlyStringSchema } from "./date-only-string-schema.ts";
import { MonetaryStringSchema } from "./monetary-string-schema.ts";

const OptionalDateOnlySchema = DateOnlyStringSchema.optional();

const ReceiptSubitemInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe("Name of the subitem")
    .openapi({ example: "Extended warranty" }),
  quantity: z.coerce
    .number()
    .int()
    .positive()
    .describe("Quantity of the subitem")
    .openapi({ example: 1 }),
  unitPrice: MonetaryStringSchema.describe("Unit price as a string"),
});

export const ReceiptItemInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(256)
    .describe("Name of the item")
    .openapi({ example: "Office chair" }),
  quantity: z.coerce
    .number()
    .int()
    .positive()
    .describe("Quantity of the item")
    .openapi({ example: 2 }),
  unitPrice: MonetaryStringSchema.describe("Unit price as a string"),
  items: z
    .array(ReceiptSubitemInputSchema)
    .optional()
    .describe("Optional list of subitems (nesting limited to 1 level)")
    .openapi({
      example: [
        {
          name: "Extended warranty",
          quantity: 1,
          unitPrice: "50.00",
        },
      ],
    }),
});

export const CreateReceiptRequestSchema = z.object({
  date: DateOnlyStringSchema.describe("Date of the receipt"),
  currencyCode: z
    .string()
    .length(3)
    .describe("ISO 4217 currency code")
    .openapi({ example: "USD" }),
  items: z
    .array(ReceiptItemInputSchema)
    .min(1)
    .describe("List of items in the receipt")
    .openapi({
      example: [
        {
          name: "Office chair",
          quantity: 2,
          unitPrice: "120.50",
        },
      ],
    }),
  merchant: z
    .object({
      name: z
        .string()
        .min(1)
        .describe("The name of the merchant")
        .openapi({ example: "Costco" }),
    })
    .optional()
    .describe("Merchant information"),
});

export type CreateReceiptRequest = z.infer<typeof CreateReceiptRequestSchema>;

const ReceiptMutationResponseSchema = z.object({
  id: z
    .number()
    .int()
    .describe("Unique identifier for the receipt")
    .openapi({ example: 42 }),
  totalAmount: MonetaryStringSchema.describe("Total amount as a string"),
  currencyCode: z
    .string()
    .describe("ISO 4217 currency code")
    .openapi({ example: "USD" }),
  merchant: z
    .object({
      id: z.number().int().describe("Merchant ID").openapi({ example: 7 }),
      name: z.string().describe("Merchant name").openapi({ example: "Costco" }),
    })
    .optional()
    .describe("Merchant information if available"),
});

export const CreateReceiptResponseSchema = ReceiptMutationResponseSchema;
export type CreateReceiptResponse = z.infer<typeof CreateReceiptResponseSchema>;

export const UpdateReceiptRequestSchema = CreateReceiptRequestSchema.partial();
export type UpdateReceiptRequest = z.infer<typeof UpdateReceiptRequestSchema>;

export const UpdateReceiptResponseSchema = ReceiptMutationResponseSchema;
export type UpdateReceiptResponse = z.infer<typeof UpdateReceiptResponseSchema>;

export const ReceiptIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .describe("Unique identifier for the receipt")
    .openapi({ example: 42 }),
});

export const GetReceiptsRequestSchema = PaginationQuerySchema.extend({
  startDate: OptionalDateOnlySchema.describe(
    "Start date for filtering receipts",
  ),
  endDate: OptionalDateOnlySchema.describe("End date for filtering receipts"),
  minimumTotalAmount: MonetaryStringSchema.optional().describe(
    "Minimum total amount filter",
  ),
  maximumTotalAmount: MonetaryStringSchema.optional().describe(
    "Maximum total amount filter",
  ),
  productName: z
    .string()
    .min(1)
    .max(256)
    .describe("Product name filter")
    .openapi({ example: "chair" })
    .optional(),
  merchantId: z
    .coerce
    .number()
    .int()
    .positive()
    .describe("Merchant ID filter")
    .openapi({ example: 7 })
    .optional(),
  sortField: z
    .nativeEnum(ReceiptSortField)
    .describe("Field to sort receipts by")
    .openapi({ example: ReceiptSortField.ReceiptDate })
    .optional(),
  sortOrder: z
    .nativeEnum(SortOrder)
    .describe("Sort order (asc/desc)")
    .openapi({ example: SortOrder.Desc })
    .optional(),
});

export type GetReceiptsRequest = z.infer<typeof GetReceiptsRequestSchema>;

export const ReceiptItemSchema = z.object({
  name: z
    .string()
    .describe("Name of the item")
    .openapi({ example: "Office chair" }),
  quantity: z.number().describe("Quantity of the item").openapi({ example: 2 }),
  unitPrice: MonetaryStringSchema.describe("Unit price as a string"),
  totalAmount: MonetaryStringSchema.describe(
    "Total amount for the item as a string",
  ),
});

export const ReceiptSummarySchema = z.object({
  id: z
    .number()
    .int()
    .describe("Unique identifier for the receipt")
    .openapi({ example: 42 }),
  date: z
    .string()
    .describe("Date of the receipt")
    .openapi({ example: "2025-03-14T00:00:00.000Z" }),
  totalAmount: MonetaryStringSchema.describe("Total amount as a string"),
  currencyCode: z
    .string()
    .describe("ISO 4217 currency code")
    .openapi({ example: "USD" }),
  items: z.array(ReceiptItemSchema).describe("List of items in the receipt"),
  merchant: z
    .object({
      id: z.number().int().describe("Merchant ID").openapi({ example: 7 }),
      name: z.string().describe("Merchant name").openapi({ example: "Costco" }),
    })
    .optional()
    .describe("Merchant information if available"),
});

export const GetReceiptsResponseSchema = z.object({
  results: z.array(ReceiptSummarySchema).describe("List of receipt summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Offset for pagination"),
  total: z.number().int().describe("Total number of receipts"),
  nextCursor: z.string().nullable().describe("Cursor for next page of results"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for previous page of results"),
});

export type GetReceiptsResponse = z.infer<typeof GetReceiptsResponseSchema>;

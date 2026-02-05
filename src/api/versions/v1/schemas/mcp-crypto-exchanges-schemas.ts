import { z } from "zod";
import { CryptoExchangeSortField } from "../enums/crypto-exchange-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Crypto Exchange Tool Schemas
export const CreateCryptoExchangeToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Name must be between 1-255 characters")
    .describe("The name of the crypto exchange"),
  taxPercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Tax percentage as decimal (0.26 = 26%)",
    ),
});

export const UpdateCryptoExchangeToolSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .describe("ID of the crypto exchange to update"),
    name: z
      .string()
      .min(1)
      .max(255, "Name must be between 1-255 characters")
      .optional()
      .describe("The new name of the crypto exchange"),
    taxPercentage: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "Tax percentage as decimal (0.26 = 26%)",
      ),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteCryptoExchangeToolSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("ID of the crypto exchange to delete"),
});

export const FilterCryptoExchangesToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Filter crypto exchanges by name (partial match)"),
  sortField: z
    .nativeEnum(CryptoExchangeSortField)
    .optional()
    .describe("Field to sort by"),
  sortOrder: z.nativeEnum(SortOrder).optional().describe("Sort order"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (default: 20, max: 100)"),
  cursor: z
    .string()
    .optional()
    .describe("Cursor for pagination (from nextCursor in previous response)"),
});

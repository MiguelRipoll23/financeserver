import { z } from "zod";
import { CryptoExchangeSortField } from "../enums/crypto-exchange-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const PercentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;

// Crypto Exchange Tool Schemas
export const CreateCryptoExchangeToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Name must be between 1-255 characters")
    .describe("The name of the crypto exchange"),
  capitalGainsTaxPercentage: z
    .string()
    .regex(
      PercentageRegex,
      "Capital gains tax percentage must be a valid number with up to 2 decimal places (e.g., '15', '20.5', '28.75')",
    )
    .optional()
    .describe(
      "The capital gains tax percentage to apply when calculating after-tax crypto values (e.g., '28' for 28%)",
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
    capitalGainsTaxPercentage: z
      .string()
      .regex(
        PercentageRegex,
        "Capital gains tax percentage must be a valid number with up to 2 decimal places (e.g., '15', '20.5', '28.75')",
      )
      .optional()
      .describe(
        "The capital gains tax percentage to apply when calculating after-tax crypto values (e.g., '28' for 28%)",
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

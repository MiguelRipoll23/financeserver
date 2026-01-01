import { z } from "zod";
import { SortOrder } from "../enums/sort-order-enum.ts";

export const SaveMerchantToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Merchant name must be between 1-255 characters")
    .describe("The name of the merchant"),
});

export const UpdateMerchantToolSchema = z
  .object({
    id: z.number().int().positive().describe("ID of the merchant to update"),
  })
  .merge(SaveMerchantToolSchema.partial())
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteMerchantToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the merchant to delete"),
});

export const FilterMerchantsToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Filter merchants by name (case insensitive partial match)"),
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
    .describe("Maximum number of merchants to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

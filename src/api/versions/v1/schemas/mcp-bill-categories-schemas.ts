import { z } from "zod";
import { BillCategorySortField } from "../enums/bill-category-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const HexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const SaveBillCategoryToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128, "Name must be between 1-128 characters")
    .describe("The bill category name in English (e.g., Groceries, Utilities)"),
  hexColor: z
    .string()
    .regex(HexColorRegex, "Color must be a valid hex code (e.g., #FF5733)")
    .optional()
    .describe("Hex color code for the category (optional)"),
});

export const UpdateBillCategoryToolSchema = z
  .object({
    id: z.number().int().positive().describe("ID of the bill category to update"),
  })
  .merge(SaveBillCategoryToolSchema.partial())
  .extend({
    favoritedAt: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .describe(
        "ISO timestamp when category was favorited; set null to clear favorite",
      ),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteBillCategoryToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the bill category to delete"),
});

export const FilterBillCategoriesToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe("Filter categories by name in English (exact match)"),
  sortField: z
    .nativeEnum(BillCategorySortField)
    .optional()
    .describe("Field to sort bill categories by"),
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
    .describe("Maximum number of categories to return (1-100)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for retrieving next page of results"),
});

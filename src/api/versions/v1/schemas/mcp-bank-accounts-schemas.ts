import { z } from "zod";
import { BankAccountType } from "../enums/bank-account-type-enum.ts";
import { BankAccountSortField } from "../enums/bank-account-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Bank Account Tool Schemas
export const CreateBankAccountToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Name must be between 1-255 characters")
    .describe("The name of the bank account"),
  type: z.nativeEnum(BankAccountType).describe("The type of the bank account"),
  taxPercentage: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Tax percentage as decimal (0.19 = 19%, optional)"),
});

export const UpdateBankAccountToolSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .describe("ID of the bank account to update"),
    name: z
      .string()
      .min(1)
      .max(255, "Name must be between 1-255 characters")
      .optional()
      .describe("The new name of the bank account"),
    type: z.nativeEnum(BankAccountType).optional().describe("The new type of the bank account"),
    taxPercentage: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Tax percentage as decimal (0.19 = 19%, optional)"),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "id"), {
    message: "At least one field to update must be provided besides the ID.",
  });

export const DeleteBankAccountToolSchema = z.object({
  id: z.number().int().positive().describe("ID of the bank account to delete"),
});

export const FilterBankAccountsToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Filter bank accounts by name (partial match)"),
  type: z.nativeEnum(BankAccountType).optional().describe("Filter bank accounts by type"),
  sortField: z
    .nativeEnum(BankAccountSortField)
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

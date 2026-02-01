import { z } from "zod";
import { BankAccountSortField } from "../enums/bank-account-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

const bankAccountTypes = [
  "checking",
  "savings",
  "credit_card",
  "investment",
  "loan",
  "deposit",
  "other",
] as const;

export type BankAccountType = (typeof bankAccountTypes)[number];

// Bank Account Tool Schemas
export const CreateBankAccountToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Name must be between 1-255 characters")
    .describe("The name of the bank account"),
  type: z
    .enum(bankAccountTypes)
    .describe("The type of the bank account"),
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
    type: z
      .enum(bankAccountTypes)
      .optional()
      .describe("The new type of the bank account"),
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
  type: z
    .enum(bankAccountTypes)
    .optional()
    .describe("Filter bank accounts by type"),
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

import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { BankAccountSortField } from "../enums/bank-account-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Bank Account schemas
export const CreateBankAccountRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Main Savings Account" })
    .describe("Bank account name"),
});

export type CreateBankAccountRequest = z.infer<
  typeof CreateBankAccountRequestSchema
>;

export const CreateBankAccountResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique bank account identifier"),
  name: z.string().openapi({ example: "Main Savings Account" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateBankAccountResponse = z.infer<
  typeof CreateBankAccountResponseSchema
>;

export const BankAccountIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type BankAccountIdParam = z.infer<typeof BankAccountIdParamSchema>;

export const UpdateBankAccountRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Updated Account Name" })
    .describe("New bank account name"),
});

export type UpdateBankAccountRequest = z.infer<
  typeof UpdateBankAccountRequestSchema
>;

export const UpdateBankAccountResponseSchema = CreateBankAccountResponseSchema;

export type UpdateBankAccountResponse = z.infer<
  typeof UpdateBankAccountResponseSchema
>;

export const GetBankAccountsRequestSchema = PaginationQuerySchema.extend({
  sortField: z
    .nativeEnum(BankAccountSortField)
    .optional()
    .openapi({ example: BankAccountSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
  name: z.string().optional().openapi({ example: "Savings" }),
});

export type GetBankAccountsRequest = z.infer<
  typeof GetBankAccountsRequestSchema
>;

export const BankAccountSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Main Savings Account" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetBankAccountsResponseSchema = z.object({
  data: z.array(BankAccountSummarySchema),
  nextCursor: z.string().nullable(),
});

export type GetBankAccountsResponse = z.infer<
  typeof GetBankAccountsResponseSchema
>;

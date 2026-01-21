import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { CashSortField } from "../enums/cash-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Cash schemas
export const CreateCashRequestSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Emergency Fund" })
    .describe("Cash source label"),
});

export type CreateCashRequest = z.infer<typeof CreateCashRequestSchema>;

export const CreateCashResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique cash source identifier"),
  label: z.string().openapi({ example: "Emergency Fund" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateCashResponse = z.infer<typeof CreateCashResponseSchema>;

export const CashIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      example: "1",
    }),
});

export type CashIdParam = z.infer<typeof CashIdParamSchema>;

export const UpdateCashRequestSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Updated Cash Label" })
    .describe("New cash source label"),
});

export type UpdateCashRequest = z.infer<typeof UpdateCashRequestSchema>;

export const UpdateCashResponseSchema = CreateCashResponseSchema;

export type UpdateCashResponse = z.infer<typeof UpdateCashResponseSchema>;

export const GetCashRequestSchema = PaginationQuerySchema.extend({
  sortField: z
    .nativeEnum(CashSortField)
    .optional()
    .openapi({ example: CashSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
  label: z.string().optional().openapi({ example: "Fund" }),
});

export type GetCashRequest = z.infer<typeof GetCashRequestSchema>;

export const CashSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  label: z.string().openapi({ example: "Emergency Fund" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetCashResponseSchema = z.object({
  data: z.array(CashSummarySchema),
  nextCursor: z.string().nullable(),
});

export type GetCashResponse = z.infer<typeof GetCashResponseSchema>;

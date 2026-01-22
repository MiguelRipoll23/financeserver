import { z } from "@hono/zod-openapi";
import { PaginationQuerySchema } from "./pagination-schemas.ts";
import { CryptoExchangeSortField } from "../enums/crypto-exchange-sort-field-enum.ts";
import { SortOrder } from "../enums/sort-order-enum.ts";

// Crypto Exchange schemas
export const CreateCryptoExchangeRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .openapi({ example: "Binance" })
    .describe("Crypto exchange name"),
});

export type CreateCryptoExchangeRequest = z.infer<
  typeof CreateCryptoExchangeRequestSchema
>;

export const CreateCryptoExchangeResponseSchema = z.object({
  id: z
    .number()
    .int()
    .openapi({ example: 1 })
    .describe("Unique crypto exchange identifier"),
  name: z.string().openapi({ example: "Binance" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export type CreateCryptoExchangeResponse = z.infer<
  typeof CreateCryptoExchangeResponseSchema
>;

export const CryptoExchangeIdParamSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "1",
  }),
});

export type CryptoExchangeIdParam = z.infer<typeof CryptoExchangeIdParamSchema>;

export const UpdateCryptoExchangeRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .openapi({ example: "Updated Exchange Name" })
    .describe("New crypto exchange name"),
});

export type UpdateCryptoExchangeRequest = z.infer<
  typeof UpdateCryptoExchangeRequestSchema
>;

export const UpdateCryptoExchangeResponseSchema =
  CreateCryptoExchangeResponseSchema;

export type UpdateCryptoExchangeResponse = z.infer<
  typeof UpdateCryptoExchangeResponseSchema
>;

export const GetCryptoExchangesRequestSchema = PaginationQuerySchema.extend({
  sortField: z
    .nativeEnum(CryptoExchangeSortField)
    .optional()
    .openapi({ example: CryptoExchangeSortField.CreatedAt }),
  sortOrder: z
    .nativeEnum(SortOrder)
    .optional()
    .openapi({ example: SortOrder.Desc }),
  name: z.string().optional().openapi({ example: "Binance" }),
});

export type GetCryptoExchangesRequest = z.infer<
  typeof GetCryptoExchangesRequestSchema
>;

export const CryptoExchangeSummarySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Binance" }),
  createdAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-01-13T10:30:00Z" }),
});

export const GetCryptoExchangesResponseSchema = z.object({
  results: z
    .array(CryptoExchangeSummarySchema)
    .describe("List of crypto exchange summaries"),
  limit: z.number().int().describe("Maximum number of results returned"),
  offset: z.number().int().describe("Number of results skipped"),
  total: z
    .number()
    .int()
    .describe("Total number of crypto exchanges matching the query"),
  nextCursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page of results or null"),
  previousCursor: z
    .string()
    .nullable()
    .describe("Cursor for the previous page of results or null"),
});

export type GetCryptoExchangesResponse = z.infer<
  typeof GetCryptoExchangesResponseSchema
>;

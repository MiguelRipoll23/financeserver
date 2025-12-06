import { z } from "@hono/zod-openapi";

export const PaginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Maximum number of items to return (1-100)")
    .openapi({ example: 10 })
    .optional(),
  cursor: z
    .string()
    .describe("Pagination cursor for fetching the next page")
    .openapi({ example: "MQ==" })
    .optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

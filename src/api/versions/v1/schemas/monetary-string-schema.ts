import { z } from "@hono/zod-openapi";

export const MonetaryStringSchema = z
  .string()
  .regex(/^[0-9]+(\.[0-9]{1,2})?$/)
  .openapi({ example: "189.99" })
  .describe(
    "Monetary value as a string, with up to two decimal places (e.g., '189.99')",
  );

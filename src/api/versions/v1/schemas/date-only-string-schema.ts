import { z } from "@hono/zod-openapi";

export const DateOnlyStringSchema = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  .openapi({ example: "2025-03-14" })
  .describe("Date value as a string in YYYY-MM-DD format (e.g., '2025-03-14')");

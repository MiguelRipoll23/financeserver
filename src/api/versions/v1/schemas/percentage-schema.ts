import { z } from "@hono/zod-openapi";

/**
 * Percentage as a decimal number between 0 and 1
 * Example: 0.035 = 3.5%
 */
export const PercentageSchema = z.number().min(0).max(1).openapi({
  example: 0.035,
  description: "Percentage as decimal (0.035 = 3.5%)",
});

/**
 * Optional percentage as a decimal number between 0 and 1
 */
export const OptionalPercentageSchema = PercentageSchema.optional();

/**
 * Nullable percentage as a decimal number between 0 and 1
 */
export const NullablePercentageSchema = PercentageSchema.nullable();

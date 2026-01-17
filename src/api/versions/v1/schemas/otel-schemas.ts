import { z } from "@hono/zod-openapi";

export const PushMetricsResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z
    .string()
    .openapi({ example: "Metrics collection request accepted" })
    .describe("Response message"),
});

export type PushMetricsResponse = z.infer<typeof PushMetricsResponseSchema>;

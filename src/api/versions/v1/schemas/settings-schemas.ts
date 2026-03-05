import { z } from "@hono/zod-openapi";

export const GetSettingsResponseSchema = z.object({
  defaultCheckingAccountId: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("ID of the default checking bank account, or null if not set")
    .openapi({ example: 1 }),
  autoCalculateBalance: z
    .boolean()
    .describe("Whether to auto-calculate checking account balance from transactions")
    .openapi({ example: true }),
});

export type GetSettingsResponse = z.infer<typeof GetSettingsResponseSchema>;

export const UpdateSettingsRequestSchema = z.object({
  defaultCheckingAccountId: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("ID of the default checking bank account, or null to clear")
    .openapi({ example: 1 }),
  autoCalculateBalance: z
    .boolean()
    .optional()
    .describe("Whether to auto-calculate checking account balance from transactions")
    .openapi({ example: true }),
});

export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;

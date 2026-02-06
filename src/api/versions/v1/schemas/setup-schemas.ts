import { z } from "@hono/zod-openapi";

export const SetupResponseSchema = z.object({
  token: z
    .string()
    .describe("Setup token to register the first passkey")
    .openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
});

export type SetupResponse = z.infer<typeof SetupResponseSchema>;

import { z } from "@hono/zod-openapi";

export const SendMessageSchema = z.object({
  sessionId: z.string().uuid().openapi({
    example: "123e4567-e89b-12d3-a456-426614174000",
  }),
  userMessage: z.string().openapi({
    example: "Analyze this receipt",
  }),
  model: z.string().openapi({
    example: "models/gemini-2.5-flash",
  }),
  mcpServer: z.enum(["GLOBAL", "PORTFOLIO", "EXPENSES"]).openapi({
    example: "GLOBAL",
  }),
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

export const UploadImageRequestSchema = z.object({
  image: z.instanceof(File).openapi({
    type: "string",
    format: "binary",
    description: "Image to upload",
  }),
});

export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>;

export const SessionIdParamSchema = z.object({
  sessionId: z.string().uuid().openapi({
    example: "123e4567-e89b-12d3-a456-426614174000",
  }),
});
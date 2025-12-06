import type { z } from "zod";

export type McpPromptRole = "user" | "assistant";

export interface McpPromptTextContent {
  type: "text";
  text: string;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export type McpPromptContent = McpPromptTextContent;

export interface McpPromptMessage {
  role: McpPromptRole;
  content: McpPromptContent;
  [key: string]: unknown;
}

export interface McpPromptRunResult {
  messages: McpPromptMessage[];
}

export interface McpPromptDefinition {
  name: string;
  meta: {
    title: string;
    description: string;
    argsSchema: z.ZodRawShape;
    annotations?: Record<string, unknown>;
  };
  run: (input: unknown) => Promise<McpPromptRunResult> | McpPromptRunResult;
}

export type McpPromptArgs<TShape extends z.ZodRawShape> = z.infer<
  z.ZodObject<TShape>
>;

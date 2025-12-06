import type { z } from "zod";

export interface McpToolRunResult<TStructured = unknown> {
  text: string;
  structured?: TStructured;
}

export interface McpToolDefinition<TStructured = unknown> {
  name: string;
  meta: {
    title: string;
    description: string;
    inputSchema: z.ZodRawShape;
    annotations?: Record<string, unknown>;
  };
  run: (input: unknown) => Promise<McpToolRunResult<TStructured>>;
}

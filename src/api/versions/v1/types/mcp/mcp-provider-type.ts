import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";

export type McpProvider = {
  getTools(): McpToolDefinition[];
  getPrompts(): McpPromptDefinition[];
};

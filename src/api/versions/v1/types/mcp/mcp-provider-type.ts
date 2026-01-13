import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";

export type McpProvider = {
  getTools(): McpToolDefinition[];
};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type McpServerWithContext = McpServer & {
  _userId?: string;
};

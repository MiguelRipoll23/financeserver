import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../cash-service.ts";
import { FilterCashToolSchema } from "../../../schemas/mcp-cash-schemas.ts";

@injectable()
export class FilterCashToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash.filter",
      meta: {
        title: "Filter cash sources",
        description:
          "Use this when you need to search and filter cash sources with optional sorting and pagination.",
        inputSchema: FilterCashToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterCashToolSchema.parse(input);

        const result = await this.cashService.getCash({
          label: parsed.label,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
          pageSize: parsed.limit,
          cursor: parsed.cursor,
        });

        const count = result.results.length;
        const cashList = result.results
          .map((cash: any) => `- ${cash.label} (ID: ${cash.id})`)
          .join("\n");

        let text = `Found ${count} cash source${count !== 1 ? "s" : ""}`;
        if (count > 0) {
          text += `:\n${cashList}`;
        }

        if (result.nextCursor) {
          text +=
            `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

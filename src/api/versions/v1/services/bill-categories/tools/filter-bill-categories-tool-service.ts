import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillCategoriesService } from "../bill-categories-service.ts";
import { FilterBillCategoriesToolSchema } from "../../../schemas/mcp-bill-categories-schemas.ts";

@injectable()
export class FilterBillCategoriesToolService {
  constructor(private billCategoriesService = inject(BillCategoriesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bill_categories.filter",
      meta: {
        title: "Filter bill categories",
        description:
          "Use this when you need to search and list bill categories by name and sorting options.",
        inputSchema: FilterBillCategoriesToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBillCategoriesToolSchema.parse(input);

        const result = await this.billCategoriesService.getBillCategories({
          cursor: parsed.cursor,
          limit: parsed.limit,
          name: parsed.name ?? undefined,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        let text = "";

        if (result.results.length === 0) {
          text = "No bill categories matched the provided filters.";
        } else {
          const categoryList = result.results
            .map((category) => {
              const color = category.hexColor ?? "no color";
              const favoriteInfo = category.favoritedAt
                ? `, favorited: ${category.favoritedAt.split("T")[0]}`
                : "";
              return `• ${category.name} (${color}${favoriteInfo}) [ID: ${category.id}]`;
            })
            .join("\n");

          text = categoryList;
          if (result.nextCursor) {
            text +=
              `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
          }
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

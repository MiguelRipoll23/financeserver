import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillCategoriesService } from "../bill-categories-service.ts";
import { UpdateBillCategoryToolSchema } from "../../../schemas/mcp-bill-categories-schemas.ts";

@injectable()
export class UpdateBillCategoryToolService {
  constructor(private billCategoriesService = inject(BillCategoriesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bill_categories.update",
      meta: {
        title: "Update bill category",
        description:
          "Use this when you need to update an existing bill category.",
        inputSchema: UpdateBillCategoryToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBillCategoryToolSchema.parse(input);

        const result = await this.billCategoriesService.updateBillCategory(
          parsed.id,
          {
            name: parsed.name,
            hexColor: parsed.hexColor,
            favoritedAt: parsed.favoritedAt,
          },
        );

        const color = result.hexColor ? ` with color ${result.hexColor}` : "";
        const text =
          `Bill category updated successfully: ${result.name}${color} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

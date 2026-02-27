import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillCategoriesService } from "../bill-categories-service.ts";
import { SaveBillCategoryToolSchema } from "../../../schemas/mcp-bill-categories-schemas.ts";

@injectable()
export class SaveBillCategoryToolService {
  constructor(private billCategoriesService = inject(BillCategoriesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bill_categories.save",
      meta: {
        title: "Save bill category",
        description: "Use this when you need to create a new bill category.",
        inputSchema: SaveBillCategoryToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveBillCategoryToolSchema.parse(input);

        const result = await this.billCategoriesService.createBillCategory({
          name: parsed.name,
          hexColor: parsed.hexColor ?? undefined,
        });

        const color = result.hexColor ? ` with color ${result.hexColor}` : "";
        const text =
          `Bill category saved successfully: ${result.name}${color} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

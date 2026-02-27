import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillCategoriesService } from "../bill-categories-service.ts";
import { DeleteBillCategoryToolSchema } from "../../../schemas/mcp-bill-categories-schemas.ts";
import { ServerError } from "../../../models/server-error.ts";

@injectable()
export class DeleteBillCategoryToolService {
  constructor(private billCategoriesService = inject(BillCategoriesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bill_categories.delete",
      meta: {
        title: "Delete bill category",
        description:
          "Use this when you need to delete a bill category that should no longer be used.",
        inputSchema: DeleteBillCategoryToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBillCategoryToolSchema.parse(input);

        try {
          await this.billCategoriesService.deleteBillCategory(parsed.id);
        } catch (error) {
          if (
            error instanceof ServerError &&
            error.getCode() === "BILL_CATEGORY_NOT_FOUND"
          ) {
            // Already deleted; preserve idempotent behavior.
          } else {
            throw error;
          }
        }

        const text = `Bill category deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

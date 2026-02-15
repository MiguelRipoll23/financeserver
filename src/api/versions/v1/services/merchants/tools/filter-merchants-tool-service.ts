import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { MerchantsService } from "../merchants-service.ts";
import { FilterMerchantsToolSchema } from "../../../schemas/mcp-merchants-schemas.ts";
import type { MerchantsFilter } from "../../../interfaces/merchants/merchants-filter-interface.ts";

@injectable()
export class FilterMerchantsToolService {
  constructor(private merchantsService = inject(MerchantsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "merchants.filter",
      meta: {
        title: "Filter merchants",
        description:
          "Use this when you need to search for merchants by name or retrieve a list of all merchants.",
        inputSchema: FilterMerchantsToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterMerchantsToolSchema.parse(input);

        const result = await this.merchantsService.getMerchants(
          parsed as MerchantsFilter,
        );

        let text = `Found ${result.total} merchant(s)`;

        if (result.results.length > 0) {
          const merchantList = result.results
            .map((m) => `- ${m.name} (ID: ${m.id})`)
            .join("\n");
          text += `:\n${merchantList}`;
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

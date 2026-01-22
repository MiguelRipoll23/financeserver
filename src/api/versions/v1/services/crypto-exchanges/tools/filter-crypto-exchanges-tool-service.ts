import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { FilterCryptoExchangesToolSchema } from "../../../schemas/mcp-crypto-exchanges-schemas.ts";

@injectable()
export class FilterCryptoExchangesToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.filter",
      meta: {
        title: "Filter crypto exchanges",
        description:
          "Use this when you need to search and list crypto exchanges with optional filters.",
        inputSchema: FilterCryptoExchangesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterCryptoExchangesToolSchema.parse(input);

        const result = await this.cryptoExchangesService.getCryptoExchanges({
          name: parsed.name,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
          pageSize: parsed.pageSize,
          cursor: parsed.cursor,
        });

        const text = `Found ${result.results.length} crypto exchanges.${
          result.nextCursor
            ? ` The response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`
            : ""
        }`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

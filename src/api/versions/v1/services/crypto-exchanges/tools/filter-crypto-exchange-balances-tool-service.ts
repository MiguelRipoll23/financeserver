import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { FilterCryptoExchangeBalancesToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class FilterCryptoExchangeBalancesToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchange_balances.filter",
      meta: {
        title: "Filter crypto exchange balances",
        description:
          "Use this when you need to search and list balances for a specific crypto exchange.",
        inputSchema: FilterCryptoExchangeBalancesToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterCryptoExchangeBalancesToolSchema.parse(input);

        const result =
          await this.cryptoExchangesService.getCryptoExchangeBalances({
            cryptoExchangeId: parsed.cryptoExchangeId,
            sortOrder: parsed.sortOrder,
            limit: parsed.pageSize,
            cursor: parsed.cursor,
          });

        const text = `Found ${result.data.length} balance entries.${
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

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchange-balances-service.ts";
import { FilterCryptoExchangeBalancesToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class FilterCryptoExchangeBalancesToolService {
  constructor(
    private cryptoExchangeBalancesService = inject(
      CryptoExchangeBalancesService,
    ),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.filter_balances",
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
          await this.cryptoExchangeBalancesService.getCryptoExchangeBalances({
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

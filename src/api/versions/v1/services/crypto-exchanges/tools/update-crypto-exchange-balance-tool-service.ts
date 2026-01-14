import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { UpdateCryptoExchangeBalanceToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class UpdateCryptoExchangeBalanceToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchange_balances.update",
      meta: {
        title: "Update crypto exchange balance",
        description: "Updates an existing crypto exchange balance entry.",
        inputSchema: UpdateCryptoExchangeBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const { id, ...payload } =
          UpdateCryptoExchangeBalanceToolSchema.parse(input);

        const result =
          await this.cryptoExchangesService.updateCryptoExchangeBalance(
            id,
            payload
          );

        const text = `Balance for ${result.symbolCode} updated successfully (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

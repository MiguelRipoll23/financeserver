import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { DeleteCryptoExchangeBalanceToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class DeleteCryptoExchangeBalanceToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchange_balances.delete",
      meta: {
        title: "Delete crypto exchange balance",
        description:
          "Use this when you need to permanently delete a crypto exchange balance entry.",
        inputSchema: DeleteCryptoExchangeBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const { id } = DeleteCryptoExchangeBalanceToolSchema.parse(input);

        await this.cryptoExchangesService.deleteCryptoExchangeBalance(id);

        const text = `Crypto exchange balance with ID ${id} deleted successfully.`;

        return {
          text,
        };
      },
    };
  }
}

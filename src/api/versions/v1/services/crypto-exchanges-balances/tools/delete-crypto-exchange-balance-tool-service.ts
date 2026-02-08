import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchange-balances-service.ts";
import { DeleteCryptoExchangeBalanceToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class DeleteCryptoExchangeBalanceToolService {
  constructor(
    private cryptoExchangeBalancesService = inject(
      CryptoExchangeBalancesService,
    ),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.delete_balance",
      meta: {
        title: "Delete crypto exchange balance",
        description:
          "Use this when you need to permanently delete a crypto exchange balance entry.",
        inputSchema: DeleteCryptoExchangeBalanceToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const { id } = DeleteCryptoExchangeBalanceToolSchema.parse(input);

        await this.cryptoExchangeBalancesService.deleteCryptoExchangeBalance(
          id,
        );

        const text = `Crypto exchange balance with ID ${id} deleted successfully.`;

        return {
          text,
        };
      },
    };
  }
}

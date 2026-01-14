import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { DeleteCryptoExchangeToolSchema } from "../../../schemas/mcp-crypto-exchanges-schemas.ts";

@injectable()
export class DeleteCryptoExchangeToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.delete",
      meta: {
        title: "Delete crypto exchange",
        description:
          "Permanently deletes a crypto exchange and all its balances.",
        inputSchema: DeleteCryptoExchangeToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const { id } = DeleteCryptoExchangeToolSchema.parse(input);

        await this.cryptoExchangesService.deleteCryptoExchange(id);

        const text = `Crypto exchange with ID ${id} deleted successfully.`;

        return {
          text,
        };
      },
    };
  }
}

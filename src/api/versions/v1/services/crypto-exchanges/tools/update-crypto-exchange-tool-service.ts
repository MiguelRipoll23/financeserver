import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { UpdateCryptoExchangeToolSchema } from "../../../schemas/mcp-crypto-exchanges-schemas.ts";

@injectable()
export class UpdateCryptoExchangeToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.update",
      meta: {
        title: "Update crypto exchange",
        description:
          "Use this when you need to update an existing crypto exchange's details.",
        inputSchema: UpdateCryptoExchangeToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const { id, ...payload } = UpdateCryptoExchangeToolSchema.parse(input);

        const result = await this.cryptoExchangesService.updateCryptoExchange(
          id,
          payload
        );

        const text = `Crypto exchange updated successfully: ${result.name} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

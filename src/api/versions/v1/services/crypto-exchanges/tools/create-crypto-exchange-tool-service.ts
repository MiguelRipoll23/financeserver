import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangesService } from "../crypto-exchanges-service.ts";
import { CreateCryptoExchangeToolSchema } from "../../../schemas/mcp-crypto-exchanges-schemas.ts";

@injectable()
export class CreateCryptoExchangeToolService {
  constructor(
    private cryptoExchangesService = inject(CryptoExchangesService)
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchanges.create",
      meta: {
        title: "Create crypto exchange",
        description:
          "Use this when you need to create a new crypto exchange. Do not use for updating or deleting crypto exchanges.",
        inputSchema: CreateCryptoExchangeToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateCryptoExchangeToolSchema.parse(input);

        const result = await this.cryptoExchangesService.createCryptoExchange({
          name: parsed.name,
          taxPercentage: parsed.taxPercentage,
        });

        const text = `Crypto exchange created successfully: ${result.name} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

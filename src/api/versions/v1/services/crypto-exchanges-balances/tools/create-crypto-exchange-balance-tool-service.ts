import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchange-balances-service.ts";
import { CreateCryptoExchangeBalanceToolSchema } from "../../../schemas/mcp-crypto-exchange-balances-schemas.ts";

@injectable()
export class CreateCryptoExchangeBalanceToolService {
  constructor(
    private cryptoExchangeBalancesService = inject(
      CryptoExchangeBalancesService,
    ),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "crypto_exchange_balances.create",
      meta: {
        title: "Create crypto exchange balance",
        description:
          "Use this when you need to add a new balance entry for a specific crypto exchange.",
        inputSchema: CreateCryptoExchangeBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateCryptoExchangeBalanceToolSchema.parse(input);

        const result =
          await this.cryptoExchangeBalancesService.createCryptoExchangeBalance(
            parsed.cryptoExchangeId,
            parsed,
          );

        const text = `Balance for ${result.symbolCode} created successfully on exchange ID ${result.cryptoExchangeId}. (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

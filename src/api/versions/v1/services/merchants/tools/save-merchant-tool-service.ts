import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { MerchantsService } from "../merchants-service.ts";
import { SaveMerchantToolSchema } from "../../../schemas/mcp-merchants-schemas.ts";

@injectable()
export class SaveMerchantToolService {
  constructor(private merchantsService = inject(MerchantsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "merchants.save",
      meta: {
        title: "Save merchant",
        description:
          "Use this when you need to save a new merchant. Do not use for updating or deleting merchants.",
        inputSchema: SaveMerchantToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveMerchantToolSchema.parse(input);

        const result = await this.merchantsService.createMerchant({
          name: parsed.name,
        });

        const text = `Merchant saved successfully: ${result.name} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

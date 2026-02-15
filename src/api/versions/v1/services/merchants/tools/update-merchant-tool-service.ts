import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { MerchantsService } from "../merchants-service.ts";
import { UpdateMerchantToolSchema } from "../../../schemas/mcp-merchants-schemas.ts";

@injectable()
export class UpdateMerchantToolService {
  constructor(private merchantsService = inject(MerchantsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "merchants.update",
      meta: {
        title: "Update merchant",
        description:
          "Use this when you need to update an existing merchant.",
        inputSchema: UpdateMerchantToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateMerchantToolSchema.parse(input);

        const result = await this.merchantsService.updateMerchant(parsed.id, {
          name: parsed.name,
        });

        const text =
          `Merchant updated successfully: ${result.name} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

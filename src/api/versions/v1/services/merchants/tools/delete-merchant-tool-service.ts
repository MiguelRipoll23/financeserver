import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { MerchantsService } from "../merchants-service.ts";
import { DeleteMerchantToolSchema } from "../../../schemas/mcp-merchants-schemas.ts";

@injectable()
export class DeleteMerchantToolService {
  constructor(private merchantsService = inject(MerchantsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "merchants.delete",
      meta: {
        title: "Delete merchant",
        description:
          "Use this when you need to delete an existing merchant.",
        inputSchema: DeleteMerchantToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteMerchantToolSchema.parse(input);

        await this.merchantsService.deleteMerchant(parsed.id);

        const text = `Merchant deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id },
        };
      },
    };
  }
}

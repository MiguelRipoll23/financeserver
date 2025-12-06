import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ReceiptsService } from "../receipts-service.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { SaveReceiptToolSchema } from "../../../schemas/mcp-receipts-schemas.ts";

@injectable()
export class SaveReceiptToolService {
  constructor(private receiptsService = inject(ReceiptsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "receipts.save",
      meta: {
        title: "Save receipt",
        description:
          "Use this when you need to save a new receipt with date and items (each with name, quantity, and unit price).",
        inputSchema: SaveReceiptToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveReceiptToolSchema.parse(input);

        const result = await this.receiptsService.createReceipt({
          date: parsed.date,
          items: parsed.items,
        });

        const displayDate = parsed.date;
        const itemCount = parsed.items.length;
        const itemsText = itemCount === 1 ? "item" : "items";

        // Calculate total items quantity
        const totalQuantity = parsed.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const quantityText = totalQuantity === 1 ? "product" : "products";
        const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

        const text = `Receipt saved successfully: ${displayDate} – ${totalQuantity} ${quantityText} across ${itemCount} ${itemsText}, total: ${result.totalAmount}${currencySymbol} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

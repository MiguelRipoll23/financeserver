import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ReceiptsService } from "../receipts-service.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { UpdateReceiptToolSchema } from "../../../schemas/mcp-receipts-schemas.ts";

@injectable()
export class UpdateReceiptToolService {
  constructor(private receiptsService = inject(ReceiptsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "receipts.update",
      meta: {
        title: "Update receipt",
        description:
          "Use this when you need to update an existing receipt. Do not use for creating new receipts or deleting receipts.",
        inputSchema: UpdateReceiptToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateReceiptToolSchema.parse(input);

        const result = await this.receiptsService.updateReceipt(parsed.id, {
          date: parsed.date,
          items: parsed.items,
          currencyCode: parsed.currencyCode,
          merchant: parsed.merchant,
        });

        const displayDate = parsed.date || "(date unchanged)";
        const itemsProvided = parsed.items !== undefined;

        if (itemsProvided) {
          const itemCount = parsed.items!.length;
          const itemsText = itemCount === 1 ? "item" : "items";

          // Calculate total items quantity
          const totalQuantity = parsed.items!.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const quantityText = totalQuantity === 1 ? "product" : "products";
          const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

          const text = `Receipt updated successfully: ${displayDate} – ${totalQuantity} ${quantityText} across ${itemCount} ${itemsText}, total: ${result.totalAmount}${currencySymbol} (ID: ${result.id})`;

          return {
            text,
            structured: result,
          };
        } else {
          const currencySymbol = getCurrencySymbolForCode(result.currencyCode);
          const text = `Receipt updated successfully: ${displayDate} – total: ${result.totalAmount}${currencySymbol} (ID: ${result.id})`;

          return {
            text,
            structured: result,
          };
        }
      },
    };
  }
}

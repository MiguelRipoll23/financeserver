import { inject, injectable } from "@needle-di/core";
import { ReceiptsService } from "../receipts-service.ts";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ReceiptSummary } from "../../../interfaces/receipts/receipt-summary-interface.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { FilterReceiptsToolSchema } from "../../../schemas/mcp-receipts-schemas.ts";

@injectable()
export class FilterReceiptsToolService {
  constructor(private receiptsService = inject(ReceiptsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "receipts.filter",
      meta: {
        title: "Filter receipts",
        description:
          "Use this when you need to search receipts by date range, total amounts, product names, or merchant name. Do not use for creating or updating receipts.",
        inputSchema: FilterReceiptsToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterReceiptsToolSchema.parse(input);
        const receiptPage = await this.receiptsService.getReceipts({
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          minimumTotalAmount: parsed.minimumTotalAmount,
          maximumTotalAmount: parsed.maximumTotalAmount,
          productName: parsed.productName,
          merchantName: parsed.merchantName,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
          limit: parsed.limit,
          cursor: parsed.cursor,
        });

        const text = this.formatText(receiptPage);

        return {
          text,
          structured: receiptPage,
        };
      },
    };
  }

  private formatText(page: {
    results: ReceiptSummary[];
    total: number;
    offset: number;
    nextCursor: string | null;
  }): string {
    if (page.results.length === 0) {
      return "No receipts matched the provided filters.";
    }

    const receiptsList = page.results
      .map((receipt) => {
        const receiptCurrencySymbol = getCurrencySymbolForCode(
          receipt.currencyCode
        );
        const header = `🧾 Receipt #${receipt.id} (${receipt.date}) ${receipt.merchant ? `(Merchant: ${receipt.merchant.name})` : ''} — Total ${receiptCurrencySymbol}${receipt.totalAmount}`;
        const lines = receipt.items
          .map((item) => {
            const formatItemLine = (
              lineItem: typeof item,
              prefix: string
            ): string => {
              const currencySymbol = getCurrencySymbolForCode(
                lineItem.currencyCode
              );
              return `${prefix} ${lineItem.name} x${lineItem.quantity} — ${currencySymbol}${lineItem.totalAmount}`;
            };

            let itemLine = formatItemLine(item, " •");

            if (item.items && item.items.length > 0) {
              const subitemsLines = item.items
                .map((subitem) => formatItemLine(subitem, "   ◦"))
                .join("\n");
              itemLine += "\n" + subitemsLines;
            }

            return itemLine;
          })
          .join("\n");
        return `${header}\n${lines}`;
      })
      .join("\n\n");

    if (page.nextCursor) {
      return (
        receiptsList +
        `\n\nThe response is paginated; use the tool input "cursor" with value "${page.nextCursor}" to keep retrieving more data.`
      );
    }

    return receiptsList;
  }
}

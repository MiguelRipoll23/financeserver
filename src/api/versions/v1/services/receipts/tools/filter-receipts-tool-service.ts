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
          "Use this when you need to search receipts by date range, total amounts, and product names.",
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
          startDate: parsed.start_date,
          endDate: parsed.end_date,
          minimumTotalAmount: parsed.min_total_amount,
          maximumTotalAmount: parsed.max_total_amount,
          productName: parsed.product_name,
          sortField: parsed.sort_field,
          sortOrder: parsed.sort_order,
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
        const header = `🧾 Receipt #${receipt.id} (${receipt.date}) — Total ${receipt.totalAmount}${receiptCurrencySymbol}`;
        const lines = receipt.items
          .map((item) => {
            const itemCurrencySymbol = getCurrencySymbolForCode(
              item.currencyCode
            );
            return ` • ${item.name} x${item.quantity} — ${item.totalAmount}${itemCurrencySymbol}`;
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

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillsService } from "../bills-service.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { FilterBillsToolSchema } from "../../../schemas/mcp-bills-schemas.ts";

@injectable()
export class FilterBillsToolService {
  constructor(private billsService = inject(BillsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bills.filter",
      meta: {
        title: "Filter bills",
        description:
          "Use this when you need to search and retrieve bills filtered by date range, category, and amount thresholds.",
        inputSchema: FilterBillsToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBillsToolSchema.parse(input);

        const result = await this.billsService.getBills({
          cursor: parsed.cursor,
          limit: parsed.limit,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          category: parsed.category,
          minimumTotalAmount: parsed.minimumTotalAmount,
          maximumTotalAmount: parsed.maximumTotalAmount,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        let text = "";

        if (result.results.length === 0) {
          text = "No bills matched the provided filters.";
        } else {
          const billsList = result.results
            .map((bill) => {
              const displayDate = bill.date.split("T")[0];
              const amount = bill.totalAmount;
              const currencySymbol = getCurrencySymbolForCode(
                bill.currencyCode,
              );
              const email = bill.senderEmail ?? "unassigned";
              return `• ${displayDate} – category ${bill.categoryId}: ${amount}${currencySymbol} (${email})`;
            })
            .join("\n");

          let text = billsList;
          if (result.nextCursor) {
            text +=
              `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
          }

          const structured = {
            ...result,
            results: result.results.map((bill) => ({
              id: bill.id,
              senderEmail: bill.senderEmail,
              date: bill.date,
              categoryId: bill.categoryId,
              totalAmount: bill.totalAmount,
              currencyCode: bill.currencyCode,
              updatedAt: bill.updatedAt,
              favoritedAt: bill.favoritedAt,
            })),
          };

          return {
            text,
            structured,
          };
        }

        const structured = {
          ...result,
          results: result.results.map((bill) => ({
            id: bill.id,
            senderEmail: bill.senderEmail,
            date: bill.date,
            categoryId: bill.categoryId,
            totalAmount: bill.totalAmount,
            currencyCode: bill.currencyCode,
            updatedAt: bill.updatedAt,
            favoritedAt: bill.favoritedAt,
          })),
        };

        return {
          text,
          structured,
        };
      },
    };
  }
}

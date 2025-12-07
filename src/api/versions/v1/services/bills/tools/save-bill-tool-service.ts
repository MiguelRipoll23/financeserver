import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillsService } from "../bills-service.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { SaveBillToolSchema } from "../../../schemas/mcp-bills-schemas.ts";

@injectable()
export class SaveBillToolService {
  constructor(private billsService = inject(BillsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bills.save",
      meta: {
        title: "Save bill",
        description:
          "Use this when you need to save a new bill or update an existing bill with date, category, total amount, and optional sender email. Do not use for deleting bills.",
        inputSchema: SaveBillToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveBillToolSchema.parse(input);

        let result;
        if (parsed.id) {
          // Update existing bill by ID
          result = await this.billsService.updateBill(parsed.id, {
            date: parsed.date,
            category: parsed.category,
            totalAmount: parsed.totalAmount,
            currencyCode: parsed.currencyCode,
            senderEmail: parsed.senderEmail,
          });
        } else {
          // Create or update bill by date
          result = await this.billsService.upsertBill({
            date: parsed.date,
            category: parsed.category,
            totalAmount: parsed.totalAmount,
            currencyCode: parsed.currencyCode,
            senderEmail: parsed.senderEmail,
          });
        }

        const displayDate = result.date.split("T")[0];
        const emailDisplay = result.senderEmail
          ? ` from ${result.senderEmail}`
          : "";
        const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

        const actionText = parsed.id ? "updated" : "saved";
        const text = `Bill ${actionText} successfully: ${displayDate} – ${result.category}: ${result.totalAmount}${currencySymbol}${emailDisplay} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

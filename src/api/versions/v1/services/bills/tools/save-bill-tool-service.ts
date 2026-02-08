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
          "Use this when you need to save a new bill. Do not use for updating or deleting bills.",
        inputSchema: SaveBillToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = SaveBillToolSchema.parse(input);

        const result = await this.billsService.createBill({
          date: parsed.date,
          category: parsed.category,
          totalAmount: parsed.totalAmount,
          currencyCode: parsed.currencyCode,
          senderEmail: parsed.senderEmail,
        });

        const displayDate = result.date.split("T")[0];
        const emailDisplay = result.senderEmail
          ? ` from ${result.senderEmail}`
          : "";
        const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

        const text =
          `Bill saved successfully: ${displayDate} – ${result.category}: ${result.totalAmount}${currencySymbol}${emailDisplay} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

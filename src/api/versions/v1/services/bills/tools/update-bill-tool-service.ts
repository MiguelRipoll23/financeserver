import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillsService } from "../bills-service.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { UpdateBillToolSchema } from "../../../schemas/mcp-bills-schemas.ts";

@injectable()
export class UpdateBillToolService {
  constructor(private billsService = inject(BillsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bills.update",
      meta: {
        title: "Update bill",
        description:
          "Use this when you need to update an existing bill. Do not use for creating new bills or deleting bills.",
        inputSchema: UpdateBillToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateBillToolSchema.parse(input);

        const result = await this.billsService.updateBill(parsed.id, {
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

        const text = `Bill updated successfully: ${displayDate} – ${result.category}: ${result.totalAmount}${currencySymbol}${emailDisplay} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

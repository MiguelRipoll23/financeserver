import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillsService } from "../bills-service.ts";
import { DeleteBillToolSchema } from "../../../schemas/mcp-bills-schemas.ts";
import { ServerError } from "../../../models/server-error.ts";

@injectable()
export class DeleteBillToolService {
  constructor(private billsService = inject(BillsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bills.delete",
      meta: {
        title: "Delete bill",
        description:
          "Use this when you need to delete a bill that contains completely invalid data.",
        inputSchema: DeleteBillToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBillToolSchema.parse(input);

        try {
          await this.billsService.deleteBill(parsed.id);
        } catch (error) {
          if (
            error instanceof ServerError &&
            error.getCode() === "BILL_NOT_FOUND"
          ) {
            // If the bill is already deleted, we can consider it a success for idempotency.
          } else {
            throw error; // Re-throw other errors
          }
        }

        const text = `Bill deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

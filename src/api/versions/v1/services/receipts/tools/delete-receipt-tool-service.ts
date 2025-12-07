import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ReceiptsService } from "../receipts-service.ts";
import { DeleteReceiptToolSchema } from "../../../schemas/mcp-receipts-schemas.ts";
import { ServerError } from "../../../models/server-error.ts";

@injectable()
export class DeleteReceiptToolService {
  constructor(private receiptsService = inject(ReceiptsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "receipts.delete",
      meta: {
        title: "Delete receipt",
        description:
          "Use this when you need to delete a receipt that contains completely invalid data. Do not use for updating or correcting receipts - use receipts.update instead.",
        inputSchema: DeleteReceiptToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteReceiptToolSchema.parse(input);

        try {
          await this.receiptsService.deleteReceipt(parsed.id);
        } catch (error) {
          if (
            error instanceof ServerError &&
            error.code === "RECEIPT_NOT_FOUND"
          ) {
            // If the receipt is already deleted, we can consider it a success for idempotency.
          } else {
            throw error; // Re-throw other errors
          }
        }

        const text = `Receipt deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BillsService } from "../bills-service.ts";
import { DeleteBillToolSchema } from "../../../schemas/mcp-bills-schemas.ts";

@injectable()
export class DeleteBillToolService {
  constructor(private billsService = inject(BillsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "bills.delete",
      meta: {
        title: "Delete bill",
        description:
          "Use this when you need to delete a bill that contains completely invalid data. Do not use for updating or correcting bills - use bills.update instead.",
        inputSchema: DeleteBillToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteBillToolSchema.parse(input);

        await this.billsService.deleteBill(parsed.id);

        const text = `Bill deleted successfully (ID: ${parsed.id})`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

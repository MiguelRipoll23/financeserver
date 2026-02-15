import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../cash-service.ts";
import { DeleteCashToolSchema } from "../../../schemas/mcp-cash-schemas.ts";

@injectable()
export class DeleteCashToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash.delete",
      meta: {
        title: "Delete cash source",
        description:
          "Use this when you need to permanently delete a cash source. Warning: This will also delete all associated balances.",
        inputSchema: DeleteCashToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = DeleteCashToolSchema.parse(input);

        await this.cashService.deleteCash(parsed.id);

        const text = `Cash source with ID ${parsed.id} deleted successfully`;

        return {
          text,
        };
      },
    };
  }
}

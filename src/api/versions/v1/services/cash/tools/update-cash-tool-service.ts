import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../cash-service.ts";
import { UpdateCashToolSchema } from "../../../schemas/mcp-cash-schemas.ts";

@injectable()
export class UpdateCashToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash.update",
      meta: {
        title: "Update cash source",
        description:
          "Use this when you need to update an existing cash source's details.",
        inputSchema: UpdateCashToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateCashToolSchema.parse(input);

        const result = await this.cashService.updateCash(parsed.id, {
          label: parsed.label,
        });

        const text =
          `Cash source updated successfully: ${result.label} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

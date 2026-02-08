import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { CashService } from "../cash-service.ts";
import { CreateCashToolSchema } from "../../../schemas/mcp-cash-schemas.ts";

@injectable()
export class CreateCashToolService {
  constructor(private cashService = inject(CashService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "cash.create",
      meta: {
        title: "Create cash source",
        description:
          "Use this when you need to create a new cash source. Do not use for updating or deleting cash sources.",
        inputSchema: CreateCashToolSchema,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = CreateCashToolSchema.parse(input);

        const result = await this.cashService.createCash({
          label: parsed.label,
        });

        const text =
          `Cash source created successfully: ${result.label} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

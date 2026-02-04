import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { UpdateBankAccountRoboadvisorBalanceToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-balances-schemas.ts";

@injectable()
export class UpdateRoboadvisorBalanceToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "roboadvisors.balances.update",
      meta: {
        title: "Update roboadvisor balance entry",
        description:
          "Use this when you need to update an existing balance entry for a roboadvisor",
        inputSchema: UpdateBankAccountRoboadvisorBalanceToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed =
          UpdateBankAccountRoboadvisorBalanceToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.updateBankAccountRoboadvisorBalance(
            parsed.id,
            {
              date: parsed.date,
              type: parsed.type,
              amount: parsed.amount,
              currencyCode: parsed.currencyCode,
            },
          );

        const text = `Balance entry updated successfully: ${result.type} of ${result.amount} ${result.currencyCode} on ${result.date} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

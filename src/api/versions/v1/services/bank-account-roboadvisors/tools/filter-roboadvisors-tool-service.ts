import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { FilterBankAccountRoboadvisorsToolSchema } from "../../../schemas/mcp-bank-account-roboadvisors-schemas.ts";

@injectable()
export class FilterRoboadvisorsToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "roboadvisors.filter",
      meta: {
        title: "Filter roboadvisors",
        description:
          "Use this when you need to retrieve roboadvisors with optional filtering and pagination. You can filter by bank account or name",
        inputSchema: FilterBankAccountRoboadvisorsToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBankAccountRoboadvisorsToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.getBankAccountRoboadvisors({
            bankAccountId: parsed.bankAccountId,
            name: parsed.name,
            pageSize: parsed.pageSize,
            cursor: parsed.cursor,
            sortField: parsed.sortField,
            sortOrder: parsed.sortOrder,
          });

        const count = result.results.length;
        const roboadvisorsList = result.results
          .map((roboadvisor) => {
            const riskPart = roboadvisor.riskLevel
              ? ` [Risk: ${roboadvisor.riskLevel}/7]`
              : "";
            const feePct = (roboadvisor.totalFeePercentage * 100).toFixed(
              2,
            );
            return `- ${roboadvisor.name}${riskPart} (Fee: ${feePct}%, Account ID: ${roboadvisor.bankAccountId}, ID: ${roboadvisor.id})`;
          })
          .join("\n");

        let text = `Found ${count} roboadvisor${count !== 1 ? "s" : ""}`;
        if (count > 0) {
          text += `:\n${roboadvisorsList}`;
        }

        if (result.nextCursor) {
          text += `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors-service.ts";
import { FilterBankAccountRoboadvisorFundsToolSchema } from "../../../schemas/mcp-bank-account-roboadvisor-funds-schemas.ts";

@injectable()
export class FilterRoboadvisorFundsToolService {
  constructor(
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
  ) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "roboadvisors.funds.filter",
      meta: {
        title: "Filter roboadvisor fund allocations",
        description:
          "Use this when you need to retrieve all fund allocations for a specific roboadvisor",
        inputSchema: FilterBankAccountRoboadvisorFundsToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterBankAccountRoboadvisorFundsToolSchema.parse(input);

        const result =
          await this.roboadvisorsService.getBankAccountRoboadvisorFunds({
            roboadvisorId: parsed.roboadvisorId,
            name: parsed.name,
            isin: parsed.isin,
            assetClass: parsed.assetClass,
            region: parsed.region,
            fundCurrencyCode: parsed.fundCurrencyCode,
            sortField: parsed.sortField,
            sortOrder: parsed.sortOrder,
            pageSize: parsed.pageSize,
            cursor: parsed.cursor,
          });

        const count = result.results.length;
        const fundsList = result.results
          .map((fund) => {
            const weightPercentage = (fund.weight * 100).toFixed(2);
            return `- ${fund.name} (${fund.isin}) - ${weightPercentage}% [${fund.assetClass}, ${fund.region}, ${fund.fundCurrencyCode}] (ID: ${fund.id})`;
          })
          .join("\n");

        let text = `Found ${count} fund allocation${count !== 1 ? "s" : ""} for roboadvisor ${parsed.roboadvisorId}`;
        if (count > 0) {
          text += `:\n${fundsList}`;
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

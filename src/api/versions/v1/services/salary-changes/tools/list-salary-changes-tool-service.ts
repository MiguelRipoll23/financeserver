import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SalaryChangesService } from "../salary-changes-service.ts";
import { ListSalaryChangesToolSchema } from "../../../schemas/mcp-salary-changes-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class ListSalaryChangesToolService {
  constructor(private salaryChangesService = inject(SalaryChangesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "salary_changes.list",
      meta: {
        title: "List salary changes",
        description:
          "Use this when you need to list and filter salary changes by description, net amount thresholds, etc.",
        inputSchema: ListSalaryChangesToolSchema,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = ListSalaryChangesToolSchema.parse(input);

        const result = await this.salaryChangesService.getSalaryChanges({
          cursor: parsed.cursor,
          limit: parsed.limit,
          recurrence: parsed.recurrence,
          minimumNetAmount: parsed.minimumNetAmount,
          maximumNetAmount: parsed.maximumNetAmount,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        });

        let text = "";

        if (result.results.length === 0) {
          text = "No salary changes matched the provided filters.";
        } else {
          const salaryChangesList = result.results
            .map((salaryChange) => {
              const amount = salaryChange.netAmount;
              const currencySymbol = getCurrencySymbolForCode(
                salaryChange.currencyCode,
              );
              return `• [${salaryChange.recurrence}] Salary Change ID ${salaryChange.id}: ${amount}${currencySymbol}`;
            })
            .join("\n");

          text = salaryChangesList;
          if (result.nextCursor) {
            text +=
              `\n\nThe response is paginated; use the tool input "cursor" with value "${result.nextCursor}" to keep retrieving more data.`;
          }
        }

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

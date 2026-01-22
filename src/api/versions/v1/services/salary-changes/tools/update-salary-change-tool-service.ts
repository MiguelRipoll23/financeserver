import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SalaryChangesService } from "../salary-changes-service.ts";
import { UpdateSalaryChangeToolSchema } from "../../../schemas/mcp-salary-changes-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class UpdateSalaryChangeToolService {
  constructor(private salaryChangesService = inject(SalaryChangesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "salary_changes.update",
      meta: {
        title: "Update salary change",
        description:
          "Use this when you need to update an existing salary change. Do not use for creating new salary changes or deleting salary changes.",
        inputSchema: UpdateSalaryChangeToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = UpdateSalaryChangeToolSchema.parse(input);

        const result = await this.salaryChangesService.updateSalaryChange(
          parsed.id,
          {
            recurrence: parsed.recurrence,
            netAmount: parsed.netAmount,
            currencyCode: parsed.currencyCode,
          },
        );

        const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

        const text = `Salary change (ID: ${result.id}) updated successfully: [${result.recurrence}] ${result.netAmount}${currencySymbol}`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

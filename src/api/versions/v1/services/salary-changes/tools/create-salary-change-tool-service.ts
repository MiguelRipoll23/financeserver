import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SalaryChangesService } from "../salary-changes-service.ts";
import { CreateSalaryChangeToolSchema } from "../../../schemas/mcp-salary-changes-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { Context } from "hono";

@injectable()
export class CreateSalaryChangeToolService {
  constructor(private salaryChangesService = inject(SalaryChangesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "salary_changes.create",
      meta: {
        title: "Create salary change",
        description:
          "Use this when you need to record a new salary change for the user.",
        inputSchema: CreateSalaryChangeToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: false,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown, context: Context<{ Variables: HonoVariables }>) => {
        const parsed = CreateSalaryChangeToolSchema.parse(input);

        const result = await this.salaryChangesService.createSalaryChange(
          {
            description: parsed.description,
            netAmount: parsed.netAmount,
            currencyCode: parsed.currencyCode,
          },
          context,
        );

        const currencySymbol = getCurrencySymbolForCode(result.currencyCode);

        const text = `Salary change recorded successfully: ${result.description} - ${result.netAmount}${currencySymbol} (ID: ${result.id})`;

        return {
          text,
          structured: result,
        };
      },
    };
  }
}

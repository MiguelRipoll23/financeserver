import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { SalaryChangesService } from "../salary-changes-service.ts";
import { DeleteSalaryChangeToolSchema } from "../../../schemas/mcp-salary-changes-schemas.ts";
import { ServerError } from "../../../models/server-error.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { Context } from "hono";

@injectable()
export class DeleteSalaryChangeToolService {
  constructor(private salaryChangesService = inject(SalaryChangesService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "salary_changes.delete",
      meta: {
        title: "Delete salary change",
        description:
          "Use this when you need to delete a salary change. Do not use for updating salary changes.",
        inputSchema: DeleteSalaryChangeToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: true,
          openWorldHint: false,
        },
      },
      run: async (input: unknown, context: Context<{ Variables: HonoVariables }>) => {
        const parsed = DeleteSalaryChangeToolSchema.parse(input);

        try {
          await this.salaryChangesService.deleteSalaryChange(parsed.id, context);
        } catch (error) {
          if (
            error instanceof ServerError &&
            error.getCode() === "SALARY_CHANGE_NOT_FOUND"
          ) {
            // If the salary change is already deleted, we can consider it a success for idempotency.
          } else {
            throw error; // Re-throw other errors
          }
        }

        const text = `Salary change (ID: ${parsed.id}) deleted successfully.`;

        return {
          text,
          structured: { id: parsed.id, deleted: true },
        };
      },
    };
  }
}

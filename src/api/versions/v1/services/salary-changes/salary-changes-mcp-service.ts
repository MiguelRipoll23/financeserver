import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { CreateSalaryChangeToolService } from "./tools/create-salary-change-tool-service.ts";
import { DeleteSalaryChangeToolService } from "./tools/delete-salary-change-tool-service.ts";
import { ListSalaryChangesToolService } from "./tools/list-salary-changes-tool-service.ts";
import { UpdateSalaryChangeToolService } from "./tools/update-salary-change-tool-service.ts";

@injectable()
export class SalaryChangesMCPService {
  constructor(
    private createSalaryChangeToolService = inject(
      CreateSalaryChangeToolService,
    ),
    private deleteSalaryChangeToolService = inject(
      DeleteSalaryChangeToolService,
    ),
    private listSalaryChangesToolService = inject(ListSalaryChangesToolService),
    private updateSalaryChangeToolService = inject(
      UpdateSalaryChangeToolService,
    ),
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.createSalaryChangeToolService.getDefinition(),
      this.deleteSalaryChangeToolService.getDefinition(),
      this.listSalaryChangesToolService.getDefinition(),
      this.updateSalaryChangeToolService.getDefinition(),
    ];
  }
}

import { inject, injectable } from "@needle-di/core";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { FilterBillCategoriesToolService } from "./tools/filter-bill-categories-tool-service.ts";
import { SaveBillCategoryToolService } from "./tools/save-bill-category-tool-service.ts";
import { UpdateBillCategoryToolService } from "./tools/update-bill-category-tool-service.ts";
import { DeleteBillCategoryToolService } from "./tools/delete-bill-category-tool-service.ts";

@injectable()
export class BillCategoriesMCPService {
  constructor(
    private filterBillCategoriesToolService = inject(
      FilterBillCategoriesToolService,
    ),
    private saveBillCategoryToolService = inject(SaveBillCategoryToolService),
    private updateBillCategoryToolService = inject(
      UpdateBillCategoryToolService,
    ),
    private deleteBillCategoryToolService = inject(
      DeleteBillCategoryToolService,
    ),
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterBillCategoriesToolService.getDefinition(),
      this.saveBillCategoryToolService.getDefinition(),
      this.updateBillCategoryToolService.getDefinition(),
      this.deleteBillCategoryToolService.getDefinition(),
    ];
  }
}

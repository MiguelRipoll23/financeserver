import { inject, injectable } from "@needle-di/core";
import { FilterProductsToolService } from "./tools/filter-products-tool-service.ts";
import { FilterProductPriceDeltasToolService } from "./tools/filter-product-price-deltas-tool-service.ts";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";

@injectable()
export class ProductsMCPService {
  constructor(
    private filterProductsToolService = inject(FilterProductsToolService),
    private filterProductPriceDeltasToolService = inject(
      FilterProductPriceDeltasToolService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterProductsToolService.getDefinition(),
      this.filterProductPriceDeltasToolService.getDefinition(),
    ];
  }
}

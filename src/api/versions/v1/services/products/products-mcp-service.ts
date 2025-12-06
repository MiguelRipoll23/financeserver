import { inject, injectable } from "@needle-di/core";
import { FilterProductsToolService } from "./tools/filter-products-tool-service.ts";
import { FilterProductPriceDeltasToolService } from "./tools/filter-product-price-deltas-tool-service.ts";
import { FilterProductsPromptService } from "./prompts/filter-products-prompt-service.ts";
import { FilterProductPriceDeltasPromptService } from "./prompts/filter-product-price-deltas-prompt-service.ts";
import { McpToolDefinition } from "../../interfaces/mcp/mcp-tool-interface.ts";
import { McpPromptDefinition } from "../../interfaces/mcp/mcp-prompt-interface.ts";

@injectable()
export class ProductsMCPService {
  constructor(
    private filterProductsToolService = inject(FilterProductsToolService),
    private filterProductPriceDeltasToolService = inject(
      FilterProductPriceDeltasToolService
    ),
    private filterProductsPromptService = inject(FilterProductsPromptService),
    private filterProductPriceDeltasPromptService = inject(
      FilterProductPriceDeltasPromptService
    )
  ) {}

  public getTools(): McpToolDefinition[] {
    return [
      this.filterProductsToolService.getDefinition(),
      this.filterProductPriceDeltasToolService.getDefinition(),
    ];
  }

  public getPrompts(): McpPromptDefinition[] {
    return [
      this.filterProductsPromptService.getDefinition(),
      this.filterProductPriceDeltasPromptService.getDefinition(),
    ];
  }
}

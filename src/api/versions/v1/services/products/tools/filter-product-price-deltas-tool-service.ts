import { inject, injectable } from "@needle-di/core";
import { ProductsService } from "../products-service.ts";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ProductPriceDelta } from "../../../interfaces/products/product-price-delta-interface.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { FilterProductPriceDeltasToolSchema } from "../../../schemas/mcp-products-schemas.ts";

@injectable()
export class FilterProductPriceDeltasToolService {
  constructor(private productsService = inject(ProductsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "products.filter_price_deltas",
      meta: {
        title: "Filter product price deltas",
        description:
          "Use this when you need to identify products with the most price variation within a date range.",
        inputSchema: FilterProductPriceDeltasToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterProductPriceDeltasToolSchema.parse(input);
        const priceDeltasPage = await this.productsService.getPriceDeltas(
          parsed
        );

        const text = this.formatText(priceDeltasPage);

        return {
          text,
          structured: priceDeltasPage,
        };
      },
    };
  }

  private formatText(page: {
    results: ProductPriceDelta[];
    total: number;
    offset: number;
    nextCursor: string | null;
  }): string {
    if (page.results.length === 0) {
      return "No products exhibited price variance in the selected period.";
    }

    const deltasList = page.results
      .map((delta) => {
        const currencySymbol = getCurrencySymbolForCode(delta.currencyCode);
        const deltaValue = Number.parseFloat(delta.priceDelta);

        let trend: string;
        if (deltaValue > 0) {
          trend = `${delta.priceDelta}${currencySymbol} more expensive`;
        } else {
          trend = `${Math.abs(deltaValue).toFixed(2)}${currencySymbol} cheaper`;
        }

        return `• ${delta.name}: min ${delta.minimumPrice}${currencySymbol}, max ${delta.maximumPrice}${currencySymbol}, current ${delta.maximumPrice}${currencySymbol} (${trend})`;
      })
      .join("\n");

    if (page.nextCursor) {
      return (
        deltasList +
        `\n\nThe response is paginated; use the tool input "cursor" with value "${page.nextCursor}" to keep retrieving more data.`
      );
    }

    return deltasList;
  }
}

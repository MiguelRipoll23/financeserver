import { inject, injectable } from "@needle-di/core";
import { ProductsService } from "../products-service.ts";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { ProductSummary } from "../../../interfaces/products/product-summary-interface.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";
import { FilterProductsToolSchema } from "../../../schemas/mcp-products-schemas.ts";

@injectable()
export class FilterProductsToolService {
  constructor(private productsService = inject(ProductsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "products.filter",
      meta: {
        title: "Filter products",
        description:
          "Use this when you need to search products by name with optional unit price filters and sorting.",
        inputSchema: FilterProductsToolSchema.shape,
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FilterProductsToolSchema.parse(input);
        const minimumUnitPrice = this.parseAmountFilter(parsed.minUnitPrice);
        const maximumUnitPrice = this.parseAmountFilter(parsed.maxUnitPrice);
        const productsPage = await this.productsService.getProducts({
          query: parsed.query,
          minimumUnitPrice,
          maximumUnitPrice,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
          limit: parsed.limit,
          cursor: parsed.cursor,
        });

        const text = this.formatText(productsPage);

        return {
          text,
          structured: productsPage,
        };
      },
    };
  }

  private formatText(page: {
    results: ProductSummary[];
    total: number;
    offset: number;
    nextCursor: string | null;
  }): string {
    if (page.results.length === 0) {
      return "No products matched the provided filters.";
    }

    const productsList = page.results
      .map((product) => {
        const currencySymbol = getCurrencySymbolForCode(product.currencyCode);
        let text = `• ${product.name} — ${product.latestUnitPrice}${currencySymbol}`;
        if (product.totalQuantity !== undefined) {
          text += ` (Total purchased: ${product.totalQuantity})`;
        }
        return text;
      })
      .join("\n");

    if (page.nextCursor) {
      return (
        productsList +
        `\n\nThe response is paginated; use the tool input "cursor" with value "${page.nextCursor}" to keep retrieving more data.`
      );
    }

    return productsList;
  }

  private parseAmountFilter(value?: string | null): number | undefined {
    if (value == null) {
      return undefined;
    }

    const numeric = Number.parseFloat(value);

    return Number.isFinite(numeric) ? numeric : undefined;
  }
}

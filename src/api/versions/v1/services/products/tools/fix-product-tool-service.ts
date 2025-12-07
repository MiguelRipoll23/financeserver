import { inject, injectable } from "@needle-di/core";
import { ProductsService } from "../products-service.ts";
import { McpToolDefinition } from "../../../interfaces/mcp/mcp-tool-interface.ts";
import { FixProductToolSchema } from "../../../schemas/mcp-products-schemas.ts";
import { getCurrencySymbolForCode } from "../../../utils/currency-utils.ts";

@injectable()
export class FixProductToolService {
  constructor(private productsService = inject(ProductsService)) {}

  public getDefinition(): McpToolDefinition {
    return {
      name: "products.fix",
      meta: {
        title: "Fix product",
        description:
          "Use this to update a product's name or unit price when fixing incorrect names from receipt processing or correcting wrong unit prices. " +
          "Don't use it to create new products, since those are created automatically during receipt processing.",
        inputSchema: FixProductToolSchema.shape,
        annotations: {
          readOnlyHint: false,
          idempotentHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      run: async (input: unknown) => {
        const parsed = FixProductToolSchema.parse(input);

        const payload: {
          name?: string;
          unitPrice?: string;
          currencyCode?: string;
          priceDate?: string;
        } = {};

        if (parsed.name !== undefined) {
          payload.name = parsed.name;
        }

        if (parsed.unit_price !== undefined) {
          payload.unitPrice = parsed.unit_price;
          payload.currencyCode = parsed.currency_code;
          payload.priceDate = parsed.price_date;
        }

        const updatedProduct = await this.productsService.updateProduct(
          parsed.id,
          payload
        );

        const currencySymbol = getCurrencySymbolForCode(
          updatedProduct.currencyCode
        );
        const text = `Product "${updatedProduct.name}" (ID: ${updatedProduct.id}) updated successfully. Latest unit price: ${updatedProduct.latestUnitPrice}${currencySymbol}`;

        return {
          text,
          structured: updatedProduct,
        };
      },
    };
  }
}

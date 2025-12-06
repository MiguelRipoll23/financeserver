export interface ProductSummary {
  id: number;
  name: string;
  latestUnitPrice: string;
  currencyCode: string;
  totalQuantity?: number;
}

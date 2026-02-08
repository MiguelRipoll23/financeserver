import { inject, injectable } from "@needle-di/core";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  itemPricesTable,
  itemsTable,
  receiptItemsTable,
} from "../../../../../db/schema.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { buildAndFilters } from "../../utils/sql-utils.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { ProductFilter } from "../../interfaces/products/product-filter-interface.ts";
import { ProductSummary } from "../../interfaces/products/product-summary-interface.ts";
import { PriceDeltaFilter } from "../../interfaces/products/price-delta-filter-interface.ts";
import { ProductPriceDelta } from "../../interfaces/products/product-price-delta-interface.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { ProductSortField } from "../../enums/product-sort-field-enum.ts";
import type { UpdateProductRequest } from "../../schemas/products-schemas.ts";
import { ServerError } from "../../models/server-error.ts";

@injectable()
export class ProductsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getProducts(params: ProductFilter) {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(params.limit);
    const offset = decodeCursor(params.cursor);

    const filters: SQL[] = [];

    if (params.query) {
      filters.push(ilike(itemsTable.name, `%${params.query}%`));
    }

    if (params.minimumUnitPrice !== undefined) {
      filters.push(
        sql`latest_prices.unit_price >= ${params.minimumUnitPrice.toFixed(2)}`,
      );
    }

    if (params.maximumUnitPrice !== undefined) {
      filters.push(
        sql`latest_prices.unit_price <= ${params.maximumUnitPrice.toFixed(2)}`,
      );
    }

    const latestPriceSubquery = sql`(
      SELECT ip1.item_id, ip1.unit_price, ip1.currency_code
      FROM ${itemPricesTable} ip1
      WHERE ip1.price_date = (
        SELECT MAX(ip2.price_date)
        FROM ${itemPricesTable} ip2
        WHERE ip2.item_id = ip1.item_id
      )
    )`;

    const totalQuantitySubquery = sql`(
      SELECT ri.item_id, COALESCE(SUM(ri.quantity), 0) as total_quantity
      FROM ${receiptItemsTable} ri
      GROUP BY ri.item_id
    )`;

    // Determine if we need quantity data for sorting
    const needsQuantityData =
      params.sortField === ProductSortField.TotalQuantity;

    const selectFields = {
      id: itemsTable.id,
      name: itemsTable.name,
      latestUnitPrice: sql<string>`latest_prices.unit_price`,
      currencyCode: sql<string>`latest_prices.currency_code`,
      ...(needsQuantityData && {
        totalQuantity: sql<
          number
        >`COALESCE(total_quantities.total_quantity, 0)`,
      }),
    };

    // Count query
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(itemsTable)
      .innerJoin(
        sql`${latestPriceSubquery} AS latest_prices`,
        eq(itemsTable.id, sql`latest_prices.item_id`),
      );

    if (needsQuantityData) {
      countQuery.leftJoin(
        sql`${totalQuantitySubquery} AS total_quantities`,
        eq(itemsTable.id, sql`total_quantities.item_id`),
      );
    }

    const [{ count }] = await countQuery.where(buildAndFilters(filters));
    const total = Number(count ?? 0);

    const orderColumn = this.resolveProductSortField(
      params.sortField ?? ProductSortField.ProductName,
      params.sortOrder ?? SortOrder.Asc,
    );

    // Main query
    const mainQuery = db
      .select(selectFields)
      .from(itemsTable)
      .innerJoin(
        sql`${latestPriceSubquery} AS latest_prices`,
        eq(itemsTable.id, sql`latest_prices.item_id`),
      );

    if (needsQuantityData) {
      mainQuery.leftJoin(
        sql`${totalQuantitySubquery} AS total_quantities`,
        eq(itemsTable.id, sql`total_quantities.item_id`),
      );
    }

    const products = await mainQuery
      .where(buildAndFilters(filters))
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset);

    const summaries: ProductSummary[] = products.map((product) => {
      const summary: ProductSummary = {
        id: product.id,
        name: product.name,
        latestUnitPrice: this.formatAmount(product.latestUnitPrice),
        currencyCode: product.currencyCode,
      };

      if (needsQuantityData && "totalQuantity" in product) {
        summary.totalQuantity = Number(product.totalQuantity ?? 0);
      }

      return summary;
    });

    return createOffsetPagination<ProductSummary>(
      summaries,
      limit,
      offset,
      total,
    );
  }

  public async getPriceDeltas(params: PriceDeltaFilter) {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(params.limit);
    const offset = decodeCursor(params.cursor);

    const sortOrder = params.sortOrder ?? SortOrder.Desc;

    // Build date filters only if provided
    const dateFilters: SQL[] = [];
    if (params.startDate) {
      dateFilters.push(gte(itemPricesTable.priceDate, params.startDate));
    }
    if (params.endDate) {
      dateFilters.push(lte(itemPricesTable.priceDate, params.endDate));
    }

    const whereClause = dateFilters.length > 0
      ? and(...dateFilters)
      : undefined;

    const [{ count }] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(
        db
          .select({
            itemId: itemPricesTable.itemId,
            priceDelta: sql<
              string
            >`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice})`,
          })
          .from(itemPricesTable)
          .where(whereClause)
          .groupBy(itemPricesTable.itemId)
          .having(
            sql`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice}) > 0`,
          )
          .as("filtered_items"),
      );

    const total = Number(count ?? 0);

    const query = await db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        minimumPrice: sql<string>`MIN(${itemPricesTable.unitPrice})`,
        maximumPrice: sql<string>`MAX(${itemPricesTable.unitPrice})`,
        priceDelta: sql<
          string
        >`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice})`,
        currencyCode: sql<string>`MIN(${itemPricesTable.currencyCode})`,
      })
      .from(itemPricesTable)
      .innerJoin(itemsTable, eq(itemsTable.id, itemPricesTable.itemId))
      .where(whereClause)
      .groupBy(itemsTable.id)
      .having(
        sql`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice}) > 0`,
      )
      .orderBy(
        sortOrder === SortOrder.Desc
          ? desc(
            sql`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice})`,
          )
          : asc(
            sql`MAX(${itemPricesTable.unitPrice}) - MIN(${itemPricesTable.unitPrice})`,
          ),
      )
      .limit(limit)
      .offset(offset);

    const results: ProductPriceDelta[] = query.map((row) => ({
      id: row.id,
      name: row.name,
      minimumPrice: this.formatAmount(row.minimumPrice),
      maximumPrice: this.formatAmount(row.maximumPrice),
      priceDelta: this.formatAmount(row.priceDelta),
      currencyCode: row.currencyCode,
    }));

    return createOffsetPagination<ProductPriceDelta>(
      results,
      limit,
      offset,
      total,
    );
  }

  public async updateProduct(
    productId: number,
    payload: Partial<UpdateProductRequest>,
  ): Promise<ProductSummary> {
    if (!payload.name && !payload.unitPrice) {
      throw new ServerError(
        "PRODUCT_UPDATE_REQUIRED",
        "At least one field (name or unitPrice) must be provided for update",
        400,
      );
    }

    const db = this.databaseService.get();

    return await db.transaction(async (tx) => {
      const existingProduct = await tx
        .select({
          id: itemsTable.id,
          currentName: itemsTable.name,
        })
        .from(itemsTable)
        .where(eq(itemsTable.id, productId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existingProduct) {
        throw new ServerError(
          "PRODUCT_NOT_FOUND",
          `Product ${productId} was not found`,
          404,
        );
      }

      let finalName = existingProduct.currentName;

      // Handle name update if provided
      if (payload.name !== undefined) {
        const normalizedName = payload.name.trim();

        if (normalizedName.length === 0) {
          throw new ServerError(
            "PRODUCT_NAME_REQUIRED",
            "Product name must not be empty",
            400,
          );
        }

        if (existingProduct.currentName !== normalizedName) {
          const conflictingProduct = await tx
            .select({ id: itemsTable.id })
            .from(itemsTable)
            .where(
              and(
                eq(itemsTable.name, normalizedName),
                ne(itemsTable.id, productId),
              ),
            )
            .limit(1)
            .then((rows) => rows[0]);

          if (conflictingProduct) {
            throw new ServerError(
              "PRODUCT_NAME_CONFLICT",
              `Another product already uses the name "${normalizedName}"`,
              409,
            );
          }

          await tx
            .update(itemsTable)
            .set({ name: normalizedName, updatedAt: new Date() })
            .where(eq(itemsTable.id, productId));

          finalName = normalizedName;
        }
      }

      // Handle price update if provided
      let latestPrice: { unitPrice: string; currencyCode: string } | null =
        null;

      if (payload.unitPrice !== undefined) {
        if (!payload.currencyCode) {
          throw new ServerError(
            "PRODUCT_CURRENCY_REQUIRED",
            "Currency code is required when updating unit price",
            400,
          );
        }

        const unitPriceCents = this.parseAmountToCents(
          payload.unitPrice,
          "PRODUCT_UNIT_PRICE_INVALID",
          "Product unit price must be a non-negative monetary value",
        );
        const unitPriceString = this.formatAmount(unitPriceCents / 100);
        const priceDate = payload.priceDate ??
          new Date().toISOString().split("T")[0];

        await tx
          .insert(itemPricesTable)
          .values({
            itemId: productId,
            priceDate,
            unitPrice: unitPriceString,
            currencyCode: payload.currencyCode,
          })
          .onConflictDoUpdate({
            target: [itemPricesTable.itemId, itemPricesTable.priceDate],
            set: {
              unitPrice: unitPriceString,
              currencyCode: payload.currencyCode,
            },
          });

        latestPrice = {
          unitPrice: unitPriceString,
          currencyCode: payload.currencyCode,
        };
      }

      // If no price was updated, fetch the latest price
      if (!latestPrice) {
        const latestPriceRecord = await tx
          .select({
            unitPrice: itemPricesTable.unitPrice,
            currencyCode: itemPricesTable.currencyCode,
          })
          .from(itemPricesTable)
          .where(eq(itemPricesTable.itemId, productId))
          .orderBy(desc(itemPricesTable.priceDate))
          .limit(1)
          .then((rows) => rows[0]);

        if (!latestPriceRecord) {
          throw new ServerError(
            "PRODUCT_PRICE_NOT_FOUND",
            `Product ${productId} has no price records`,
            500,
          );
        }

        latestPrice = {
          unitPrice: latestPriceRecord.unitPrice,
          currencyCode: latestPriceRecord.currencyCode,
        };
      }

      return {
        id: productId,
        name: finalName,
        latestUnitPrice: latestPrice.unitPrice,
        currencyCode: latestPrice.currencyCode,
      } satisfies ProductSummary;
    });
  }

  public async deleteProduct(productId: number): Promise<void> {
    const db = this.databaseService.get();

    const existingProduct = await db
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(eq(itemsTable.id, productId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingProduct) {
      throw new ServerError(
        "PRODUCT_NOT_FOUND",
        `Product ${productId} was not found`,
        404,
      );
    }

    await this.assertNotReferencedByReceipts(productId);
    await this.assertNoChildItems(productId);

    await db.delete(itemsTable).where(eq(itemsTable.id, productId));
  }

  private resolveLimit(requested?: number): number {
    if (!requested) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  }

  private resolveProductSortField(field: ProductSortField, order: SortOrder) {
    let column: SQL | typeof itemsTable.name;

    switch (field) {
      case ProductSortField.UnitPrice:
        column = sql`latest_prices.unit_price`;
        break;
      case ProductSortField.TotalQuantity:
        column = sql`COALESCE(total_quantities.total_quantity, 0)`;
        break;
      default:
        column = itemsTable.name;
        break;
    }

    return order === SortOrder.Desc ? desc(column) : asc(column);
  }

  private parseAmountToCents(
    amount: string,
    errorCode: string,
    errorMessage: string,
  ): number {
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(amount)) {
      throw new ServerError(errorCode, errorMessage, 400);
    }

    const numeric = Number.parseFloat(amount);

    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new ServerError(errorCode, errorMessage, 400);
    }

    return Math.round(numeric * 100);
  }

  private formatAmount(value: string | number): string {
    const numeric = Number.parseFloat(String(value));

    if (!Number.isFinite(numeric)) {
      throw new ServerError(
        "PRODUCT_PRICE_INVALID",
        "Failed to format product monetary value",
        500,
      );
    }

    return numeric.toFixed(2);
  }

  private async assertNotReferencedByReceipts(
    productId: number,
  ): Promise<void> {
    const usage = await this.databaseService
      .get()
      .select({ id: receiptItemsTable.id })
      .from(receiptItemsTable)
      .where(eq(receiptItemsTable.itemId, productId))
      .limit(1)
      .then((rows: { id: number }[]) => rows[0]);

    if (usage) {
      throw new ServerError(
        "PRODUCT_IN_USE",
        `Product ${productId} is referenced by existing receipts and cannot be deleted`,
        409,
      );
    }
  }

  private async assertNoChildItems(productId: number): Promise<void> {
    const childItem = await this.databaseService
      .get()
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(eq(itemsTable.parentItemId, productId))
      .limit(1)
      .then((rows: { id: number }[]) => rows[0]);

    if (childItem) {
      throw new ServerError(
        "PRODUCT_HAS_CHILD_ITEMS",
        `Product ${productId} has child items and cannot be deleted. Remove or reassign child items first.`,
        409,
      );
    }
  }
}

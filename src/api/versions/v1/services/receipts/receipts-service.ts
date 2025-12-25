import { inject, injectable } from "@needle-di/core";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
  gte,
  lte,
  type SQL,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  itemsTable,
  itemPricesTable,
  receiptItemsTable,
  receiptsTable,
  merchantsTable,
} from "../../../../../db/schema.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { buildAndFilters } from "../../utils/sql-utils.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";
import { ReceiptsFilter } from "../../interfaces/receipts/receipts-filter-interface.ts";
import { ReceiptSummary } from "../../interfaces/receipts/receipt-summary-interface.ts";
import { ReceiptLineItem } from "../../interfaces/receipts/receipt-line-item-interface.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { ReceiptSortField } from "../../enums/receipt-sort-field-enum.ts";
import { ServerError } from "../../models/server-error.ts";
import type {
  CreateReceiptRequest,
  CreateReceiptResponse,
  UpdateReceiptRequest,
  UpdateReceiptResponse,
  GetReceiptsResponse,
} from "../../schemas/receipts-schemas.ts";
import { MerchantsService } from "../merchants/merchants-service.ts";
type NormalizedReceiptItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  unitPriceString: string;
  currencyCode: string;
  subitems?: NormalizedReceiptItem[];
};
type ReceiptItemInput = {
  name: string;
  quantity: number;
  unitPrice: string;
  currencyCode: string;
  items?: ReceiptItemInput[];
};
@injectable()
export class ReceiptsService {
  constructor(
    private databaseService = inject(DatabaseService),
    private merchantsService = inject(MerchantsService)
  ) {}

  public async createReceipt(
    payload: CreateReceiptRequest
  ): Promise<CreateReceiptResponse> {
    if (payload.items.length === 0) {
      throw new ServerError(
        "RECEIPT_NO_ITEMS",
        "At least one item is required to create a receipt",
        400
      );
    }

    const db = this.databaseService.get();
    const receiptDate = payload.date;
    const normalizedItems = this.normalizeReceiptItems(payload.items);
    const totalInCents = normalizedItems.reduce<number>(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const totalAmountString = this.formatAmount(totalInCents / 100);

    const merchantId = await this.merchantsService.getOrCreateMerchantId(
      payload.merchant
    );

    const receiptId = await db.transaction(async (tx) => {
      // Use the currency code from the first item (all items should have same currency)
      const receiptCurrencyCode = normalizedItems[0].currencyCode;

      const [{ id }] = await tx
        .insert(receiptsTable)
        .values({
          receiptDate,
          totalAmount: totalAmountString,
          currencyCode: receiptCurrencyCode,
          merchantId,
        })
        .returning({ id: receiptsTable.id });

      for (const lineItem of normalizedItems) {
        await this.insertReceiptItem(tx, id, receiptDate, lineItem, null);
      }

      return id;
    });

    const merchant = await this.merchantsService.getMerchantInfo(merchantId);

    return {
      id: receiptId,
      totalAmount: totalAmountString,
      currencyCode: normalizedItems[0].currencyCode,
      merchant,
    } satisfies CreateReceiptResponse;
  }

  public async updateReceipt(
    receiptId: number,
    payload: Partial<UpdateReceiptRequest>
  ): Promise<UpdateReceiptResponse> {
    const db = this.databaseService.get();

    return await db.transaction(async (tx) => {
      const existingReceipt = await tx
        .select({
          id: receiptsTable.id,
          receiptDate: receiptsTable.receiptDate,
          totalAmount: receiptsTable.totalAmount,
          currencyCode: receiptsTable.currencyCode,
        })
        .from(receiptsTable)
        .where(eq(receiptsTable.id, receiptId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existingReceipt) {
        throw new ServerError(
          "RECEIPT_NOT_FOUND",
          `Receipt ${receiptId} was not found`,
          404
        );
      }

      const isoReceiptDate = toISOStringSafe(existingReceipt.receiptDate);

      if (isoReceiptDate === "Invalid date") {
        throw new ServerError(
          "RECEIPT_DATE_INVALID",
          `Receipt ${receiptId} has an invalid receiptDate value`,
          500
        );
      }

      // Build update object with only provided fields
      const updateData: {
        receiptDate?: string;
        totalAmount?: string;
        currencyCode?: string;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      let normalizedItems;
      let receiptCurrencyCode = existingReceipt.currencyCode;

      // Handle items update
      if (payload.items !== undefined) {
        if (payload.items.length === 0) {
          throw new ServerError(
            "RECEIPT_NO_ITEMS",
            "At least one item is required when updating items",
            400
          );
        }

        normalizedItems = this.normalizeReceiptItems(payload.items);

        const totalInCents = normalizedItems.reduce<number>(
          (sum, item) => sum + item.unitPriceCents * item.quantity,
          0
        );
        updateData.totalAmount = this.formatAmount(totalInCents / 100);

        // Use the currency code from the first item (all items should have same currency)
        receiptCurrencyCode = normalizedItems[0].currencyCode;
        updateData.currencyCode = receiptCurrencyCode;

        // Delete old items
        await tx
          .delete(receiptItemsTable)
          .where(eq(receiptItemsTable.receiptId, receiptId));
      }

      // Handle date update
      const receiptDate = payload.date || isoReceiptDate;
      if (payload.date !== undefined) {
        updateData.receiptDate = payload.date;
      }

      // Update receipt table if there are changes
      if (Object.keys(updateData).length > 1) {
        await tx
          .update(receiptsTable)
          .set(updateData)
          .where(eq(receiptsTable.id, receiptId));
      }

      // Insert new items if items were updated
      if (normalizedItems) {
        for (const item of normalizedItems) {
          await this.insertReceiptItem(tx, receiptId, receiptDate, item, null);
        }
      }

      // Get final state
      const finalReceipt = await tx
        .select({
          totalAmount: receiptsTable.totalAmount,
          currencyCode: receiptsTable.currencyCode,
        })
        .from(receiptsTable)
        .where(eq(receiptsTable.id, receiptId))
        .limit(1)
        .then((rows) => rows[0]);

      return {
        id: receiptId,
        totalAmount: finalReceipt!.totalAmount,
        currencyCode: finalReceipt!.currencyCode,
      } satisfies UpdateReceiptResponse;
    });
  }

  public async getReceipts(
    params: ReceiptsFilter
  ): Promise<GetReceiptsResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(params.limit);
    const offset = decodeCursor(params.cursor);

    const filters: SQL[] = [];

    // Filter by merchant name if provided
    if (params.merchantName) {
      // Find merchant IDs matching the name (case-insensitive, partial match)
      const matchingMerchants = await db
        .select({ id: merchantsTable.id })
        .from(merchantsTable)
        .where(ilike(merchantsTable.name, `%${params.merchantName}%`));

      const merchantIds = matchingMerchants.map((row) => row.id as number);
      if (merchantIds.length === 0) {
        return createOffsetPagination<ReceiptSummary>(
          [],
          limit,
          offset,
          0
        ) as GetReceiptsResponse;
      }
      filters.push(inArray(receiptsTable.merchantId, merchantIds));
    }

    if (params.startDate) {
      filters.push(gte(receiptsTable.receiptDate, params.startDate));
    }

    if (params.endDate) {
      filters.push(lte(receiptsTable.receiptDate, params.endDate));
    }

    if (params.minimumTotalAmount !== undefined) {
      const minimumCents = this.parseAmountToCents(
        params.minimumTotalAmount,
        "RECEIPT_MIN_TOTAL_INVALID",
        "Minimum total amount filter must be a non-negative monetary value"
      );

      filters.push(
        gte(receiptsTable.totalAmount, this.formatAmount(minimumCents / 100))
      );
    }

    if (params.maximumTotalAmount !== undefined) {
      const maximumCents = this.parseAmountToCents(
        params.maximumTotalAmount,
        "RECEIPT_MAX_TOTAL_INVALID",
        "Maximum total amount filter must be a non-negative monetary value"
      );

      filters.push(
        lte(receiptsTable.totalAmount, this.formatAmount(maximumCents / 100))
      );
    }

    if (params.productName) {
      const matchingReceiptIds = await db
        .select({ receiptId: receiptItemsTable.receiptId })
        .from(receiptItemsTable)
        .innerJoin(itemsTable, eq(itemsTable.id, receiptItemsTable.itemId))
        .where(ilike(itemsTable.name, `%${params.productName}%`));

      const uniqueIds = [
        ...new Set(matchingReceiptIds.map((row) => row.receiptId as number)),
      ];

      if (uniqueIds.length === 0) {
        return createOffsetPagination<ReceiptSummary>(
          [],
          limit,
          offset,
          0
        ) as GetReceiptsResponse;
      }

      filters.push(inArray(receiptsTable.id, uniqueIds));
    }

    const orderColumn = this.resolveReceiptSortField(
      params.sortField ?? ReceiptSortField.ReceiptDate,
      params.sortOrder ?? SortOrder.Desc
    );

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(receiptsTable)
      .where(buildAndFilters(filters));

    const total = Number(count ?? 0);

    const receiptRows = await db
      .select({
        id: receiptsTable.id,
        receiptDate: receiptsTable.receiptDate,
        totalAmount: receiptsTable.totalAmount,
        currencyCode: receiptsTable.currencyCode,
        merchantId: receiptsTable.merchantId,
      })
      .from(receiptsTable)
      .where(buildAndFilters(filters))
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset);

    if (receiptRows.length === 0) {
      return createOffsetPagination<ReceiptSummary>(
        [],
        limit,
        offset,
        total
      ) as GetReceiptsResponse;
    }

    const receiptIds = receiptRows.map((row) => row.id as number);

    const receiptItems = await db
      .select({
        receiptId: receiptItemsTable.receiptId,
        itemId: itemsTable.id,
        name: itemsTable.name,
        parentItemId: itemsTable.parentItemId,
        quantity: receiptItemsTable.quantity,
        totalAmount: receiptItemsTable.totalAmount,
        currencyCode: sql<string>`(
          SELECT ip.currency_code 
          FROM ${itemPricesTable} ip 
          WHERE ip.item_id = ${itemsTable.id} 
          ORDER BY ip.price_date DESC 
          LIMIT 1
        )`,
      })
      .from(receiptItemsTable)
      .innerJoin(itemsTable, eq(itemsTable.id, receiptItemsTable.itemId))
      .where(inArray(receiptItemsTable.receiptId, receiptIds));

    type ReceiptItemRow = {
      receiptId: number | null;
      itemId: number;
      name: string;
      parentItemId: number | null;
      quantity: number;
      totalAmount: string | number;
      currencyCode: string;
    };

    const groupedItems = receiptItems.reduce<Record<number, ReceiptItemRow[]>>(
      (groupedByReceipt, row) => {
        const collection = groupedByReceipt[row.receiptId as number] ?? [];
        collection.push(row as ReceiptItemRow);
        groupedByReceipt[row.receiptId as number] = collection;
        return groupedByReceipt;
      },
      {}
    );

    // Fetch all merchants for receipts in one query
    const merchantIds = [
      ...new Set(receiptRows.map((r) => r.merchantId).filter(Boolean)),
    ] as number[];
    let merchantMap: Record<number, { id: number; name: string }> = {};
    if (merchantIds.length > 0) {
      const merchants = await db
        .select({ id: merchantsTable.id, name: merchantsTable.name })
        .from(merchantsTable)
        .where(inArray(merchantsTable.id, merchantIds));
      merchantMap = Object.fromEntries(merchants.map((m) => [m.id, m]));
    }

    const summaries: ReceiptSummary[] = receiptRows.map((receipt) => {
      const allItems = groupedItems[receipt.id as number] ?? [];

      // Separate parent items and subitems
      const parentItems = allItems.filter((item) => item.parentItemId === null);
      const subitemsMap = allItems
        .filter((item) => item.parentItemId !== null)
        .reduce<Record<number, ReceiptItemRow[]>>((acc, item) => {
          const parentId = item.parentItemId!;
          if (!acc[parentId]) acc[parentId] = [];
          acc[parentId].push(item);
          return acc;
        }, {});

      const items: ReceiptLineItem[] = parentItems.map((item) => {
        const lineTotalNumber = this.parseStoredAmount(
          item.totalAmount,
          "RECEIPT_ITEM_TOTAL_CORRUPTED",
          `Receipt ${receipt.id} item "${item.name}" total amount is invalid`
        );

        const unitPriceValue = lineTotalNumber / item.quantity;

        if (!Number.isFinite(unitPriceValue)) {
          throw new ServerError(
            "RECEIPT_UNIT_PRICE_DERIVATION_FAILED",
            `Failed to derive unit price for receipt ${receipt.id} item "${item.name}"`,
            500
          );
        }

        const lineItem: ReceiptLineItem = {
          name: item.name,
          quantity: item.quantity,
          unitPrice: this.formatAmount(unitPriceValue),
          totalAmount: this.formatAmount(lineTotalNumber),
          currencyCode: item.currencyCode,
        };

        // Add subitems if they exist
        const subitems = subitemsMap[item.itemId];
        if (subitems && subitems.length > 0) {
          lineItem.items = subitems.map((subitem): ReceiptLineItem => {
            const subLineTotalNumber = this.parseStoredAmount(
              subitem.totalAmount,
              "RECEIPT_SUBITEM_TOTAL_CORRUPTED",
              `Receipt ${receipt.id} subitem "${subitem.name}" total amount is invalid`
            );

            const subUnitPriceValue = subLineTotalNumber / subitem.quantity;

            if (!Number.isFinite(subUnitPriceValue)) {
              throw new ServerError(
                "RECEIPT_SUBITEM_UNIT_PRICE_DERIVATION_FAILED",
                `Failed to derive unit price for receipt ${receipt.id} subitem "${subitem.name}"`,
                500
              );
            }

            return {
              name: subitem.name,
              quantity: subitem.quantity,
              unitPrice: this.formatAmount(subUnitPriceValue),
              totalAmount: this.formatAmount(subLineTotalNumber),
              currencyCode: subitem.currencyCode,
            };
          });
        }

        return lineItem;
      });

      let merchant: { id: number; name: string } | undefined = undefined;
      if (receipt.merchantId && merchantMap[receipt.merchantId]) {
        merchant = merchantMap[receipt.merchantId];
      }

      return {
        id: receipt.id,
        date: toISOStringSafe(receipt.receiptDate),
        totalAmount: this.formatStoredAmount(
          receipt.totalAmount,
          "RECEIPT_TOTAL_CORRUPTED",
          `Stored total amount for receipt ${receipt.id} is invalid`
        ),
        currencyCode: receipt.currencyCode,
        items,
        merchant,
      } satisfies ReceiptSummary;
    });

    return createOffsetPagination<ReceiptSummary>(
      summaries,
      limit,
      offset,
      total
    ) as GetReceiptsResponse;
  }

  public async deleteReceipt(receiptId: number): Promise<void> {
    const db = this.databaseService.get();

    const deleted = await db
      .delete(receiptsTable)
      .where(eq(receiptsTable.id, receiptId))
      .returning({ id: receiptsTable.id });

    if (deleted.length === 0) {
      throw new ServerError(
        "RECEIPT_NOT_FOUND",
        `Receipt ${receiptId} was not found`,
        404
      );
    }
  }

  private async insertReceiptItem(
    tx: NodePgDatabase,
    receiptId: number,
    receiptDate: string,
    item: NormalizedReceiptItem,
    parentItemId: number | null
  ): Promise<void> {
    const itemId = await this.createOrGetItem(tx, item.name, parentItemId);

    const lineTotalCents = item.unitPriceCents * item.quantity;
    const lineTotalString = this.formatAmount(lineTotalCents / 100);

    await tx.insert(receiptItemsTable).values({
      receiptId,
      itemId,
      quantity: item.quantity,
      totalAmount: lineTotalString,
    });

    await tx
      .insert(itemPricesTable)
      .values({
        itemId,
        priceDate: receiptDate,
        unitPrice: item.unitPriceString,
        currencyCode: item.currencyCode,
      })
      .onConflictDoUpdate({
        target: [itemPricesTable.itemId, itemPricesTable.priceDate],
        set: {
          unitPrice: item.unitPriceString,
          currencyCode: item.currencyCode,
        },
      });

    // Process subitems if any
    if (item.subitems && item.subitems.length > 0) {
      for (const subitem of item.subitems) {
        await this.insertReceiptItem(
          tx,
          receiptId,
          receiptDate,
          subitem,
          itemId
        );
      }
    }
  }

  private async createOrGetItem(
    tx: NodePgDatabase,
    itemName: string,
    parentItemId: number | null
  ): Promise<number> {
    const normalizedName = itemName.trim();

    // Build the where clause to consider both name and parentItemId
    const whereClause =
      parentItemId === null
        ? and(
            eq(itemsTable.name, normalizedName),
            isNull(itemsTable.parentItemId)
          )
        : and(
            eq(itemsTable.name, normalizedName),
            eq(itemsTable.parentItemId, parentItemId)
          );

    const existingItem = await tx
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(whereClause)
      .limit(1)
      .then((rows) => rows[0]);

    let itemId = existingItem?.id;

    if (!itemId) {
      const inserted = await tx
        .insert(itemsTable)
        .values({
          name: normalizedName,
          parentItemId,
        })
        .onConflictDoNothing()
        .returning({ id: itemsTable.id });

      itemId = inserted[0]?.id;

      if (!itemId) {
        const fallback = await tx
          .select({ id: itemsTable.id })
          .from(itemsTable)
          .where(whereClause)
          .limit(1);
        itemId = fallback[0]?.id;
      }
    }

    if (!itemId) {
      throw new ServerError(
        "ITEM_CREATION_FAILED",
        `Failed to create or retrieve item "${normalizedName}"`,
        500
      );
    }

    return itemId;
  }

  private resolveLimit(requested?: number): number {
    if (!requested) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  }

  private resolveReceiptSortField(field: ReceiptSortField, order: SortOrder) {
    const column =
      field === ReceiptSortField.TotalAmount
        ? receiptsTable.totalAmount
        : receiptsTable.receiptDate;

    return order === SortOrder.Desc ? desc(column) : asc(column);
  }

  private normalizeReceiptItems(
    items: CreateReceiptRequest["items"] | UpdateReceiptRequest["items"]
  ): NormalizedReceiptItem[] {
    return items.map((item) => this.normalizeSingleItem(item, false));
  }

  private normalizeSingleItem(
    item: ReceiptItemInput,
    isSubitem: boolean,
    parentName?: string
  ): NormalizedReceiptItem {
    const name = item.name.trim();

    if (name.length === 0) {
      const errorCode = isSubitem
        ? "RECEIPT_SUBITEM_NAME_REQUIRED"
        : "RECEIPT_ITEM_NAME_REQUIRED";
      const errorMessage = isSubitem
        ? `Subitem name must not be empty for parent item "${parentName}"`
        : "Item name must not be empty";
      throw new ServerError(errorCode, errorMessage, 400);
    }

    const unitPriceString = item.unitPrice;

    if (!unitPriceString) {
      const errorCode = isSubitem
        ? "RECEIPT_SUBITEM_UNIT_PRICE_REQUIRED"
        : "RECEIPT_UNIT_PRICE_REQUIRED";
      const errorMessage = `Unit price is required for ${
        isSubitem ? "subitem" : "item"
      } "${name}"`;
      throw new ServerError(errorCode, errorMessage, 400);
    }

    const unitPriceCents = this.parseAmountToCents(
      unitPriceString,
      isSubitem
        ? "RECEIPT_SUBITEM_UNIT_PRICE_INVALID"
        : "RECEIPT_UNIT_PRICE_INVALID",
      `Unit price for ${
        isSubitem ? "subitem" : "item"
      } "${name}" must be a non-negative monetary value`
    );

    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      const errorCode = isSubitem
        ? "RECEIPT_SUBITEM_QUANTITY_INVALID"
        : "RECEIPT_ITEM_QUANTITY_INVALID";
      const errorMessage = `Quantity for ${
        isSubitem ? "subitem" : "item"
      } "${name}" must be a positive integer`;
      throw new ServerError(errorCode, errorMessage, 400);
    }

    // Process subitems only for parent items (enforces 1-level nesting limit)
    // Subitems cannot have their own nested items, preventing deeper hierarchies
    let subitems: NormalizedReceiptItem[] | undefined;
    if (item.items && item.items.length > 0) {
      if (isSubitem) {
        throw new ServerError(
          "RECEIPT_SUBITEM_NESTING_NOT_ALLOWED",
          `Subitem "${name}" cannot have nested items; only one level of nesting is supported`,
          400
        );
      }
      subitems = item.items.map((subitem) =>
        this.normalizeSingleItem(subitem, true, name)
      );
    }

    return {
      name,
      quantity: item.quantity,
      unitPriceCents,
      unitPriceString: this.formatAmount(unitPriceCents / 100),
      currencyCode: item.currencyCode,
      subitems,
    } satisfies NormalizedReceiptItem;
  }

  private parseAmountToCents(
    amount: string,
    errorCode: string,
    errorMessage: string
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

  private formatAmount(value: number): string {
    return value.toFixed(2);
  }

  private formatStoredAmount(
    value: unknown,
    errorCode: string,
    errorMessage: string
  ): string {
    const numeric = this.parseStoredAmount(value, errorCode, errorMessage);
    return this.formatAmount(numeric);
  }

  private parseStoredAmount(
    value: unknown,
    errorCode: string,
    errorMessage: string
  ): number {
    const numeric = Number.parseFloat(String(value));

    if (!Number.isFinite(numeric)) {
      throw new ServerError(errorCode, errorMessage, 500);
    }

    return numeric;
  }
}

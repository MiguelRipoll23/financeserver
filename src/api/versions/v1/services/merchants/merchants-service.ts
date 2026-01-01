import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { merchantsTable } from "../../../../../db/schema.ts";
import { MerchantInput } from "../../interfaces/merchants/merchant-input-interface.ts";
import { ServerError } from "../../models/server-error.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { MerchantsFilter } from "../../interfaces/merchants/merchants-filter-interface.ts";
import { MerchantSummary } from "../../interfaces/merchants/merchant-summary-interface.ts";
import type {
  GetMerchantsResponse,
  UpsertMerchantRequest,
  UpsertMerchantResponse,
} from "../../schemas/merchants-schemas.ts";

@injectable()
export class MerchantsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getOrCreateMerchantId(
    merchant?: MerchantInput
  ): Promise<number | undefined> {
    if (!merchant?.name) {
      return undefined;
    }
    const merchantName = merchant.name.trim();
    if (merchantName === "") {
      return undefined;
    }
    const db = this.databaseService.get();
    await db
      .insert(merchantsTable)
      .values({ name: merchantName })
      .onConflictDoNothing();
    const existingMerchant = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(ilike(merchantsTable.name, merchantName))
      .limit(1)
      .then((rows) => rows[0]);
    return existingMerchant?.id;
  }

  public async getMerchantInfo(
    merchantId?: number | null
  ): Promise<{ id: number; name: string } | undefined> {
    if (!merchantId) return undefined;
    const db = this.databaseService.get();
    const merchant = await db
      .select({ id: merchantsTable.id, name: merchantsTable.name })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId))
      .limit(1)
      .then((rows) => rows[0]);
    return merchant;
  }

  public async createMerchant(
    payload: UpsertMerchantRequest
  ): Promise<UpsertMerchantResponse> {
    const merchantName = payload.name.trim();

    if (merchantName.length === 0) {
      throw new ServerError(
        "MERCHANT_NAME_REQUIRED",
        "Merchant name is required",
        400
      );
    }

    const db = this.databaseService.get();

    // Check if merchant with same name already exists (case insensitive)
    const existingMerchant = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(sql`lower(${merchantsTable.name}) = lower(${merchantName})`)
      .limit(1)
      .then((rows) => rows[0]);

    if (existingMerchant) {
      throw new ServerError(
        "MERCHANT_NAME_CONFLICT",
        `A merchant with name "${merchantName}" already exists`,
        409
      );
    }

    const [merchant] = await db
      .insert(merchantsTable)
      .values({ name: merchantName })
      .returning({
        id: merchantsTable.id,
        name: merchantsTable.name,
        createdAt: merchantsTable.createdAt,
        updatedAt: merchantsTable.updatedAt,
      });

    return {
      id: merchant.id,
      name: merchant.name,
      createdAt: toISOStringSafe(merchant.createdAt),
      updatedAt: toISOStringSafe(merchant.updatedAt),
    };
  }

  public async getMerchants(
    filters: MerchantsFilter
  ): Promise<GetMerchantsResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(filters.limit);
    const offset = decodeCursor(filters.cursor);

    const conditions: SQL[] = [];

    if (filters.name) {
      const searchPattern = `%${filters.name.trim()}%`;
      conditions.push(ilike(merchantsTable.name, searchPattern));
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(merchantsTable)
      .where(whereClause);

    const total = count;

    // Determine sort order
    const sortOrderClause =
      filters.sortOrder === SortOrder.Desc
        ? desc(merchantsTable.name)
        : asc(merchantsTable.name);

    // Get merchants with pagination
    const rows = await db
      .select({
        id: merchantsTable.id,
        name: merchantsTable.name,
        createdAt: merchantsTable.createdAt,
        updatedAt: merchantsTable.updatedAt,
      })
      .from(merchantsTable)
      .where(whereClause)
      .orderBy(sortOrderClause)
      .limit(limit)
      .offset(offset);

    const summaries: MerchantSummary[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: toISOStringSafe(row.createdAt),
      updatedAt: toISOStringSafe(row.updatedAt),
    }));

    return createOffsetPagination<MerchantSummary>(
      summaries,
      limit,
      offset,
      total
    ) as GetMerchantsResponse;
  }

  public async updateMerchant(
    merchantId: number,
    payload: Partial<UpsertMerchantRequest>
  ): Promise<UpsertMerchantResponse> {
    const db = this.databaseService.get();

    // Check if merchant exists
    const existingMerchant = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingMerchant) {
      throw new ServerError(
        "MERCHANT_NOT_FOUND",
        `Merchant ${merchantId} was not found`,
        404
      );
    }

    // Build update object with only provided fields
    const updateData: { name?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      const merchantName = payload.name.trim();

      if (merchantName.length === 0) {
        throw new ServerError(
          "MERCHANT_NAME_REQUIRED",
          "Merchant name is required",
          400
        );
      }

      // Check for name conflicts (excluding current merchant)
      const conflictingMerchant = await db
        .select({ id: merchantsTable.id })
        .from(merchantsTable)
        .where(
          sql`lower(${merchantsTable.name}) = lower(${merchantName}) AND ${merchantsTable.id} != ${merchantId}`
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (conflictingMerchant) {
        throw new ServerError(
          "MERCHANT_NAME_CONFLICT",
          `Another merchant with name "${merchantName}" already exists`,
          409
        );
      }

      updateData.name = merchantName;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 1) {
      await db
        .update(merchantsTable)
        .set(updateData)
        .where(eq(merchantsTable.id, merchantId));
    }

    // Load and return updated merchant
    const [merchant] = await db
      .select({
        id: merchantsTable.id,
        name: merchantsTable.name,
        createdAt: merchantsTable.createdAt,
        updatedAt: merchantsTable.updatedAt,
      })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    return {
      id: merchant.id,
      name: merchant.name,
      createdAt: toISOStringSafe(merchant.createdAt),
      updatedAt: toISOStringSafe(merchant.updatedAt),
    };
  }

  public async deleteMerchant(merchantId: number): Promise<void> {
    const db = this.databaseService.get();

    const deleted = await db
      .delete(merchantsTable)
      .where(eq(merchantsTable.id, merchantId))
      .returning({ id: merchantsTable.id });

    if (deleted.length === 0) {
      throw new ServerError(
        "MERCHANT_NOT_FOUND",
        `Merchant ${merchantId} was not found`,
        404
      );
    }
  }

  private resolveLimit(requested?: number): number {
    if (!requested) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  }
}

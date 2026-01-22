import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { billCategoriesTable } from "../../../../../db/schema.ts";
import { ServerError } from "../../models/server-error.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { buildAndFilters } from "../../utils/sql-utils.ts";
import { toISOStringNullable, toISOStringSafe } from "../../utils/date-utils.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { BillCategorySortField } from "../../enums/bill-category-sort-field-enum.ts";
import {
  BillCategoryResponse,
  CreateBillCategoryRequest,
  GetBillCategoriesResponse,
  UpdateBillCategoryRequest,
} from "../../schemas/bill-categories-schemas.ts";

type NormalizedCategoryInput = {
  name: string;
  normalized: string;
};

@injectable()
export class BillCategoriesService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createBillCategory(
    payload: CreateBillCategoryRequest,
  ): Promise<BillCategoryResponse> {
    const categoryInput = this.normalizeCategoryInput(payload.name);

    if (categoryInput.name.length === 0) {
      throw new ServerError(
        "BILL_CATEGORY_NAME_REQUIRED",
        "Bill category name is required",
        400,
      );
    }

    const db = this.databaseService.get();

    const [insertedCategory] = await db
      .insert(billCategoriesTable)
      .values({
        name: categoryInput.name,
        normalizedName: categoryInput.normalized,
      })
      .onConflictDoNothing()
      .returning();

    if (!insertedCategory) {
      const existingCategory = await db
        .select()
        .from(billCategoriesTable)
        .where(eq(billCategoriesTable.normalizedName, categoryInput.normalized))
        .limit(1);

      if (existingCategory.length > 0) {
        throw new ServerError(
          "BILL_CATEGORY_CONFLICT",
          `Bill category with name "${payload.name}" already exists`,
          409,
        );
      }
      throw new ServerError(
        "BILL_CATEGORY_CREATION_FAILED",
        `Failed to create bill category "${payload.name}"`,
        500,
      );
    }

    return this.mapBillCategoryToResponse(insertedCategory);
  }

  public async getBillCategories(
    filters: {
      name?: string;
      sortField?: BillCategorySortField;
      sortOrder?: SortOrder;
      limit?: number;
      cursor?: string;
    },
  ): Promise<GetBillCategoriesResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(filters.limit);
    const offset = decodeCursor(filters.cursor);

    const conditions: SQL[] = [];

    const filteredCategoryName = filters.name?.trim();
    if (filteredCategoryName) {
      const normalizedFilter = this.normalizeCategoryInput(filteredCategoryName);
      conditions.push(
        eq(billCategoriesTable.normalizedName, normalizedFilter.normalized),
      );
    }

    const predicate = buildAndFilters(conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(billCategoriesTable)
      .where(predicate);

    const total = Number(count ?? 0);

    if (total === 0) {
      return createOffsetPagination<BillCategoryResponse>(
        [],
        limit,
        offset,
        total,
      ) as GetBillCategoriesResponse;
    }

    const order = this.resolveSortField(
      filters.sortField ?? BillCategorySortField.Name,
      filters.sortOrder ?? SortOrder.Asc,
    );

    const rows = await db
      .select()
      .from(billCategoriesTable)
      .where(predicate)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const categories = rows.map((row) => this.mapBillCategoryToResponse(row));

    return createOffsetPagination<BillCategoryResponse>(
      categories,
      limit,
      offset,
      total,
    ) as GetBillCategoriesResponse;
  }

  public async updateBillCategory(
    id: number,
    payload: UpdateBillCategoryRequest,
  ): Promise<BillCategoryResponse> {
    const db = this.databaseService.get();

    const [existingCategory] = await db
      .select()
      .from(billCategoriesTable)
      .where(eq(billCategoriesTable.id, id))
      .limit(1);

    if (!existingCategory) {
      throw new ServerError(
        "BILL_CATEGORY_NOT_FOUND",
        `Bill category with ID ${id} not found`,
        404,
      );
    }

    const updateData: Partial<typeof billCategoriesTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      const categoryInput = this.normalizeCategoryInput(payload.name);
      if (categoryInput.name.length === 0) {
        throw new ServerError(
          "BILL_CATEGORY_NAME_REQUIRED",
          "Bill category name is required",
          400,
        );
      }
      updateData.name = categoryInput.name;
      updateData.normalizedName = categoryInput.normalized;
    }

    if (payload.favoritedAt !== undefined) {
      updateData.favoritedAt = payload.favoritedAt
        ? new Date(payload.favoritedAt)
        : null;
    }

    const [updatedCategory] = await db
      .update(billCategoriesTable)
      .set(updateData)
      .where(eq(billCategoriesTable.id, id))
      .returning();

    if (!updatedCategory) {
      throw new ServerError(
        "BILL_CATEGORY_UPDATE_FAILED",
        `Failed to update bill category with ID ${id}`,
        500,
      );
    }

    return this.mapBillCategoryToResponse(updatedCategory);
  }

  public async deleteBillCategory(id: number): Promise<void> {
    const db = this.databaseService.get();

    const [deletedCategory] = await db
      .delete(billCategoriesTable)
      .where(eq(billCategoriesTable.id, id))
      .returning();

    if (!deletedCategory) {
      throw new ServerError(
        "BILL_CATEGORY_NOT_FOUND",
        `Bill category with ID ${id} not found`,
        404,
      );
    }
  }

  private resolveLimit(requested?: number): number {
    if (!requested) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  }

  private resolveSortField(field: BillCategorySortField, order: SortOrder) {
    const column =
      field === BillCategorySortField.Name
        ? billCategoriesTable.name
        : field === BillCategorySortField.CreatedAt
          ? billCategoriesTable.createdAt
          : field === BillCategorySortField.UpdatedAt
            ? billCategoriesTable.updatedAt
            : billCategoriesTable.favoritedAt;

    return order === SortOrder.Desc ? desc(column) : asc(column);
  }

  private normalizeCategoryInput(value: string): NormalizedCategoryInput {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return { name: "", normalized: "" };
    }

    const compacted = trimmed.replace(/\s+/g, " ");

    return {
      name: compacted,
      normalized: compacted.toLowerCase(),
    } satisfies NormalizedCategoryInput;
  }

  private mapBillCategoryToResponse(
    entity: typeof billCategoriesTable.$inferSelect,
  ): BillCategoryResponse {
    return {
      id: entity.id,
      name: entity.name,
      normalizedName: entity.normalizedName,
      favoritedAt: toISOStringNullable(entity.favoritedAt),
      createdAt: toISOStringSafe(entity.createdAt),
      updatedAt: toISOStringSafe(entity.updatedAt),
    };
  }
}

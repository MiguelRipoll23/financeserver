import { inject, injectable } from "@needle-di/core";
import { and, asc, desc, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  billCategoriesTable,
  billEmailsTable,
  billsTable,
} from "../../../../../db/schema.ts";
import { ServerError } from "../../models/server-error.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { buildAndFilters } from "../../utils/sql-utils.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { BillSortField } from "../../enums/bill-sort-field-enum.ts";
import { BillsFilter } from "../../interfaces/bills/bills-filter-interface.ts";
import { BillSummary } from "../../interfaces/bills/bill-summary-interface.ts";
import type {
  GetBillsResponse,
  UpsertBillRequest,
  UpsertBillResponse,
} from "../../schemas/bills-schemas.ts";

type NormalizedCategoryInput = {
  name: string;
  normalized: string;
};

@injectable()
export class BillsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createBill(
    payload: Omit<UpsertBillRequest, "senderEmail"> & {
      senderEmail?: string | null;
    }
  ): Promise<UpsertBillResponse> {
    const categoryInput = this.normalizeCategoryInput(payload.category);

    if (categoryInput.name.length === 0) {
      throw new ServerError(
        "BILL_CATEGORY_REQUIRED",
        "Category is required to create a bill",
        400
      );
    }

    const billDate = payload.date;

    const totalAmountCents = this.parseAmountToCents(
      payload.totalAmount,
      "BILL_TOTAL_INVALID",
      "Bill total amount must be a non-negative monetary value"
    );
    const totalAmountString = this.formatAmount(totalAmountCents / 100);

    const db = this.databaseService.get();

    return await db.transaction(async (tx) => {
      // Check if a bill already exists for this date
      const existingBill = await tx
        .select({ id: billsTable.id })
        .from(billsTable)
        .where(eq(billsTable.billDate, billDate))
        .limit(1)
        .then((rows) => rows[0]);

      if (existingBill) {
        throw new ServerError(
          "BILL_DATE_CONFLICT",
          `A bill already exists for date ${billDate}`,
          409
        );
      }

      const emailId = await this.resolveOptionalEmailId(
        tx,
        payload.senderEmail
      );
      const categoryId = await this.resolveCategoryId(tx, categoryInput);

      const values = {
        billDate,
        categoryId,
        totalAmount: totalAmountString,
        currencyCode: payload.currencyCode,
        emailId,
      };

      const [{ id: billId }] = await tx
        .insert(billsTable)
        .values(values)
        .returning({ id: billsTable.id });

      return await this.loadBillResponse(tx, billId);
    });
  }

  public async upsertBill(
    payload: Omit<UpsertBillRequest, "senderEmail"> & {
      senderEmail?: string | null;
    }
  ): Promise<UpsertBillResponse> {
    const categoryInput = this.normalizeCategoryInput(payload.category);

    if (categoryInput.name.length === 0) {
      throw new ServerError(
        "BILL_CATEGORY_REQUIRED",
        "Category is required to register a bill",
        400
      );
    }

    const billDate = payload.date;

    const totalAmountCents = this.parseAmountToCents(
      payload.totalAmount,
      "BILL_TOTAL_INVALID",
      "Bill total amount must be a non-negative monetary value"
    );
    const totalAmountString = this.formatAmount(totalAmountCents / 100);

    const db = this.databaseService.get();

    return await db.transaction(async (tx) => {
      const emailId = await this.resolveOptionalEmailId(
        tx,
        payload.senderEmail
      );
      const categoryId = await this.resolveCategoryId(tx, categoryInput);

      const existingBill = await tx
        .select({ id: billsTable.id })
        .from(billsTable)
        .where(eq(billsTable.billDate, billDate))
        .limit(1)
        .then((rows) => rows[0]);

      let billId: number;

      if (existingBill) {
        billId = existingBill.id;

        await tx
          .update(billsTable)
          .set({
            categoryId,
            totalAmount: totalAmountString,
            currencyCode: payload.currencyCode,
            emailId,
            updatedAt: new Date(),
          })
          .where(eq(billsTable.id, billId));
      } else {
        const values = {
          billDate,
          categoryId,
          totalAmount: totalAmountString,
          currencyCode: payload.currencyCode,
          emailId,
        };

        const [{ id }] = await tx
          .insert(billsTable)
          .values(values)
          .returning({ id: billsTable.id });

        billId = id;
      }

      return await this.loadBillResponse(tx, billId);
    });
  }

  public async getBills(filters: BillsFilter): Promise<GetBillsResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(filters.limit ?? undefined);
    const offset = decodeCursor(filters.cursor);

    const conditions: SQL[] = [];

    if (filters.startDate) {
      conditions.push(gte(billsTable.billDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(billsTable.billDate, filters.endDate));
    }

    const filteredCategory = filters.category?.trim();

    if (filteredCategory) {
      const normalizedFilter = this.normalizeCategoryInput(filteredCategory);
      conditions.push(
        eq(billCategoriesTable.normalizedName, normalizedFilter.normalized)
      );
    }

    if (filters.minimumTotalAmount != null) {
      const minimumCents = this.parseAmountToCents(
        filters.minimumTotalAmount,
        "BILL_MIN_TOTAL_INVALID",
        "Minimum total amount filter must be a non-negative monetary value"
      );

      conditions.push(
        gte(billsTable.totalAmount, this.formatAmount(minimumCents / 100))
      );
    }

    if (filters.maximumTotalAmount != null) {
      const maximumCents = this.parseAmountToCents(
        filters.maximumTotalAmount,
        "BILL_MAX_TOTAL_INVALID",
        "Maximum total amount filter must be a non-negative monetary value"
      );

      conditions.push(
        lte(billsTable.totalAmount, this.formatAmount(maximumCents / 100))
      );
    }

    const predicate = buildAndFilters(conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(billsTable)
      .innerJoin(
        billCategoriesTable,
        eq(billCategoriesTable.id, billsTable.categoryId)
      )
      .where(predicate);

    const total = Number(count ?? 0);

    if (total === 0) {
      return createOffsetPagination<BillSummary>(
        [],
        limit,
        offset,
        total
      ) as GetBillsResponse;
    }

    const order = this.resolveSortField(
      filters.sortField ?? BillSortField.BillDate,
      filters.sortOrder ?? SortOrder.Desc
    );

    const rows = await db
      .select({
        id: billsTable.id,
        billDate: billsTable.billDate,
        categoryName: billCategoriesTable.name,
        totalAmount: billsTable.totalAmount,
        currencyCode: billsTable.currencyCode,
        updatedAt: billsTable.updatedAt,
        senderEmail: billEmailsTable.email,
      })
      .from(billsTable)
      .innerJoin(
        billCategoriesTable,
        eq(billCategoriesTable.id, billsTable.categoryId)
      )
      .leftJoin(billEmailsTable, eq(billEmailsTable.id, billsTable.emailId))
      .where(predicate)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const summaries: BillSummary[] = rows.map((row) => ({
      id: row.id,
      senderEmail: row.senderEmail ?? null,
      date: toISOStringSafe(row.billDate),
      category: row.categoryName,
      totalAmount: this.formatStoredAmount(
        row.totalAmount,
        "BILL_TOTAL_CORRUPTED",
        `Stored bill amount for bill ${row.id} is invalid`
      ),
      currencyCode: row.currencyCode,
      updatedAt: toISOStringSafe(row.updatedAt),
    }));

    return createOffsetPagination<BillSummary>(
      summaries,
      limit,
      offset,
      total
    ) as GetBillsResponse;
  }

  public async updateBill(
    billId: number,
    payload: Partial<
      Omit<UpsertBillRequest, "senderEmail"> & { senderEmail?: string | null }
    >
  ): Promise<UpsertBillResponse> {
    const db = this.databaseService.get();

    return await db.transaction(async (tx) => {
      const existingBill = await tx
        .select({
          id: billsTable.id,
          billDate: billsTable.billDate,
          categoryId: billsTable.categoryId,
          totalAmount: billsTable.totalAmount,
          currencyCode: billsTable.currencyCode,
          emailId: billsTable.emailId,
        })
        .from(billsTable)
        .where(eq(billsTable.id, billId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existingBill) {
        throw new ServerError(
          "BILL_NOT_FOUND",
          `Bill ${billId} was not found`,
          404
        );
      }

      // Build update object with only provided fields
      const updateData: {
        billDate?: string;
        categoryId?: number;
        totalAmount?: string;
        currencyCode?: string;
        emailId?: number | null;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      // Handle date update
      if (payload.date != null) {
        const billDate = payload.date;

        // Check for date conflicts if date is being changed
        if (existingBill.billDate !== billDate) {
          const conflictingBill = await tx
            .select({ id: billsTable.id })
            .from(billsTable)
            .where(
              and(eq(billsTable.billDate, billDate), ne(billsTable.id, billId))
            )
            .limit(1)
            .then((rows) => rows[0]);

          if (conflictingBill) {
            throw new ServerError(
              "BILL_DATE_CONFLICT",
              `Another bill already exists for date ${billDate}`,
              409
            );
          }
        }

        updateData.billDate = billDate;
      }

      // Handle category update
      if (payload.category !== undefined) {
        const categoryInput = this.normalizeCategoryInput(payload.category);

        if (categoryInput.name.length === 0) {
          throw new ServerError(
            "BILL_CATEGORY_REQUIRED",
            "Category cannot be empty",
            400
          );
        }

        const categoryId = await this.resolveCategoryId(tx, categoryInput);
        updateData.categoryId = categoryId;
      }

      // Handle total amount update
      if (payload.totalAmount !== undefined) {
        const totalAmountCents = this.parseAmountToCents(
          payload.totalAmount,
          "BILL_TOTAL_INVALID",
          "Bill total amount must be a non-negative monetary value"
        );
        updateData.totalAmount = this.formatAmount(totalAmountCents / 100);
      }

      // Handle currency code update
      if (payload.currencyCode !== undefined) {
        updateData.currencyCode = payload.currencyCode;
      }

      // Handle sender email update
      if (payload.senderEmail !== undefined) {
        updateData.emailId = await this.resolveOptionalEmailId(
          tx,
          payload.senderEmail
        );
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 1) {
        await tx
          .update(billsTable)
          .set(updateData)
          .where(eq(billsTable.id, billId));
      }

      return await this.loadBillResponse(tx, billId);
    });
  }

  public async deleteBill(billId: number): Promise<void> {
    const db = this.databaseService.get();

    const deleted = await db
      .delete(billsTable)
      .where(eq(billsTable.id, billId))
      .returning({ id: billsTable.id });

    if (deleted.length === 0) {
      throw new ServerError(
        "BILL_NOT_FOUND",
        `Bill ${billId} was not found`,
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

  private async loadBillResponse(
    tx: NodePgDatabase,
    billId: number
  ): Promise<UpsertBillResponse> {
    const billRow = await tx
      .select({
        id: billsTable.id,
        billDate: billsTable.billDate,
        categoryName: billCategoriesTable.name,
        totalAmount: billsTable.totalAmount,
        currencyCode: billsTable.currencyCode,
        updatedAt: billsTable.updatedAt,
        senderEmail: billEmailsTable.email,
      })
      .from(billsTable)
      .innerJoin(
        billCategoriesTable,
        eq(billCategoriesTable.id, billsTable.categoryId)
      )
      .leftJoin(billEmailsTable, eq(billEmailsTable.id, billsTable.emailId))
      .where(eq(billsTable.id, billId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!billRow) {
      throw new ServerError(
        "BILL_NOT_FOUND",
        "Bill could not be retrieved after persistence",
        500
      );
    }

    return {
      id: billRow.id,
      senderEmail: billRow.senderEmail ?? null,
      date: toISOStringSafe(billRow.billDate),
      category: billRow.categoryName,
      totalAmount: this.formatStoredAmount(
        billRow.totalAmount,
        "BILL_TOTAL_CORRUPTED",
        "Stored bill amount is not a valid number"
      ),
      currencyCode: billRow.currencyCode,
      updatedAt: toISOStringSafe(billRow.updatedAt),
    } satisfies UpsertBillResponse;
  }

  private resolveSortField(field: BillSortField, order: SortOrder) {
    const column =
      field === BillSortField.TotalAmount
        ? billsTable.totalAmount
        : field === BillSortField.Category
        ? billCategoriesTable.name
        : billsTable.billDate;

    return order === SortOrder.Desc ? desc(column) : asc(column);
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
    const numeric = Number.parseFloat(String(value));

    if (!Number.isFinite(numeric)) {
      throw new ServerError(errorCode, errorMessage, 500);
    }

    return this.formatAmount(numeric);
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

  private async resolveCategoryId(
    tx: NodePgDatabase,
    category: NormalizedCategoryInput
  ): Promise<number> {
    const existing = await tx
      .select({ id: billCategoriesTable.id })
      .from(billCategoriesTable)
      .where(eq(billCategoriesTable.normalizedName, category.normalized))
      .limit(1)
      .then((rows) => rows[0]?.id);

    if (existing) {
      return existing;
    }

    const inserted = await tx
      .insert(billCategoriesTable)
      .values({
        name: category.name,
        normalizedName: category.normalized,
      })
      .onConflictDoNothing()
      .returning({ id: billCategoriesTable.id })
      .then((rows) => rows[0]?.id);

    if (inserted) {
      return inserted;
    }

    const fallback = await tx
      .select({ id: billCategoriesTable.id })
      .from(billCategoriesTable)
      .where(eq(billCategoriesTable.normalizedName, category.normalized))
      .limit(1)
      .then((rows) => rows[0]?.id ?? null);

    if (fallback) {
      return fallback;
    }

    throw new ServerError(
      "BILL_CATEGORY_RESOLUTION_FAILED",
      `Failed to persist bill category "${category.name}"`,
      500
    );
  }

  private async resolveOptionalEmailId(
    tx: NodePgDatabase,
    senderEmail?: string | null
  ): Promise<number | null> {
    if (!senderEmail || senderEmail.trim().length === 0) {
      return null;
    }

    return await this.resolveEmailId(tx, senderEmail);
  }

  private async resolveEmailId(
    tx: NodePgDatabase,
    senderEmail: string
  ): Promise<number> {
    const normalizedEmail = senderEmail.trim().toLowerCase();

    if (normalizedEmail.length === 0) {
      throw new ServerError(
        "BILL_SENDER_EMAIL_REQUIRED",
        "Sender email is required",
        400
      );
    }

    const existing = await tx
      .select({ id: billEmailsTable.id })
      .from(billEmailsTable)
      .where(eq(billEmailsTable.email, normalizedEmail))
      .limit(1)
      .then((rows) => rows[0]?.id);

    if (existing) {
      return existing;
    }

    const inserted = await tx
      .insert(billEmailsTable)
      .values({ email: normalizedEmail })
      .onConflictDoNothing()
      .returning({ id: billEmailsTable.id })
      .then((rows) => rows[0]?.id);

    if (inserted) {
      return inserted;
    }

    const fallback = await tx
      .select({ id: billEmailsTable.id })
      .from(billEmailsTable)
      .where(eq(billEmailsTable.email, normalizedEmail))
      .limit(1)
      .then((rows) => rows[0]?.id ?? null);

    if (fallback) {
      return fallback;
    }

    throw new ServerError(
      "BILL_EMAIL_RESOLUTION_FAILED",
      `Failed to persist sender email "${normalizedEmail}"`,
      500
    );
  }
}

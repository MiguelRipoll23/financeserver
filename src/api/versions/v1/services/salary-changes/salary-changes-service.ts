import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { salaryChangesTable } from "../../../../../db/schema.ts";
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
import { SalaryChangeSortField } from "../../enums/salary-change-sort-field-enum.ts";

import type {
  CreateSalaryChangeRequest,
  GetSalaryChangesResponse,
  SalaryChangeResponse,
  UpdateSalaryChangeRequest,
} from "../../schemas/salary-changes-schemas.ts";

@injectable()
export class SalaryChangesService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createSalaryChange(
    payload: CreateSalaryChangeRequest,
  ): Promise<SalaryChangeResponse> {
    const db = this.databaseService.get();

    const netAmountCents = this.parseAmountToCents(
      payload.netAmount,
      "SALARY_CHANGE_NET_AMOUNT_INVALID",
      "Net amount must be a non-negative monetary value",
    );
    const netAmountString = this.formatAmount(netAmountCents / 100);

    const [insertedSalaryChange] = await db
      .insert(salaryChangesTable)
      .values({
        description: payload.description,
        netAmount: netAmountString,
        currencyCode: payload.currencyCode,
      })
      .returning();

    if (!insertedSalaryChange) {
      throw new ServerError(
        "SALARY_CHANGE_CREATION_FAILED",
        "Failed to create salary change",
        500,
      );
    }

    return this.mapSalaryChangeToResponse(insertedSalaryChange);
  }

  public async getSalaryChanges(
    filters: {
      description?: string;
      minimumNetAmount?: string;
      maximumNetAmount?: string;
      sortField?: SalaryChangeSortField;
      sortOrder?: SortOrder;
      limit?: number;
      cursor?: string;
    },
  ): Promise<GetSalaryChangesResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(filters.limit);
    const offset = decodeCursor(filters.cursor);

    const conditions: SQL[] = [];

    const filteredDescription = filters.description?.trim();
    if (filteredDescription) {
      conditions.push(eq(salaryChangesTable.description, filteredDescription));
    }

    if (filters.minimumNetAmount !== undefined) {
      const minimumCents = this.parseAmountToCents(
        filters.minimumNetAmount,
        "SALARY_CHANGE_MIN_NET_AMOUNT_INVALID",
        "Minimum net amount filter must be a non-negative monetary value",
      );
      conditions.push(
        gte(salaryChangesTable.netAmount, this.formatAmount(minimumCents / 100)),
      );
    }

    if (filters.maximumNetAmount !== undefined) {
      const maximumCents = this.parseAmountToCents(
        filters.maximumNetAmount,
        "SALARY_CHANGE_MAX_NET_AMOUNT_INVALID",
        "Maximum net amount filter must be a non-negative monetary value",
      );
      conditions.push(
        lte(salaryChangesTable.netAmount, this.formatAmount(maximumCents / 100)),
      );
    }

    const predicate = buildAndFilters(conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(salaryChangesTable)
      .where(predicate);

    const total = Number(count ?? 0);

    if (total === 0) {
      return createOffsetPagination<SalaryChangeResponse>(
        [],
        limit,
        offset,
        total,
      ) as GetSalaryChangesResponse;
    }

    const order = this.resolveSortField(
      filters.sortField ?? SalaryChangeSortField.CreatedAt,
      filters.sortOrder ?? SortOrder.Desc,
    );

    const rows = await db
      .select()
      .from(salaryChangesTable)
      .where(predicate)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const salaryChanges = rows.map((row) => this.mapSalaryChangeToResponse(row));

    return createOffsetPagination<SalaryChangeResponse>(
      salaryChanges,
      limit,
      offset,
      total,
    ) as GetSalaryChangesResponse;
  }

  public async getSalaryChangeById(
    id: number,
  ): Promise<SalaryChangeResponse> {
    const db = this.databaseService.get();

    const [salaryChange] = await db
      .select()
      .from(salaryChangesTable)
      .where(eq(salaryChangesTable.id, id))
      .limit(1);

    if (!salaryChange) {
      throw new ServerError(
        "SALARY_CHANGE_NOT_FOUND",
        `Salary change with ID ${id} not found`,
        404,
      );
    }

    return this.mapSalaryChangeToResponse(salaryChange);
  }

  public async updateSalaryChange(
    id: number,
    payload: UpdateSalaryChangeRequest,
  ): Promise<SalaryChangeResponse> {
    const db = this.databaseService.get();

    const existingSalaryChange = await db
      .select()
      .from(salaryChangesTable)
      .where(eq(salaryChangesTable.id, id))
      .limit(1);

    if (!existingSalaryChange) {
      throw new ServerError(
        "SALARY_CHANGE_NOT_FOUND",
        `Salary change with ID ${id} not found`,
        404,
      );
    }

    const updateData: Partial<typeof salaryChangesTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }

    if (payload.netAmount !== undefined) {
      const netAmountCents = this.parseAmountToCents(
        payload.netAmount,
        "SALARY_CHANGE_NET_AMOUNT_INVALID",
        "Net amount must be a non-negative monetary value",
      );
      updateData.netAmount = this.formatAmount(netAmountCents / 100);
    }

    if (payload.currencyCode !== undefined) {
      updateData.currencyCode = payload.currencyCode;
    }

    const [updatedSalaryChange] = await db
      .update(salaryChangesTable)
      .set(updateData)
      .where(eq(salaryChangesTable.id, id))
      .returning();

    if (!updatedSalaryChange) {
      throw new ServerError(
        "SALARY_CHANGE_UPDATE_FAILED",
        `Failed to update salary change with ID ${id}`,
        500,
      );
    }

    return this.mapSalaryChangeToResponse(updatedSalaryChange);
  }

  public async deleteSalaryChange(
    id: number,
  ): Promise<void> {
    const db = this.databaseService.get();

    const [deletedSalaryChange] = await db
      .delete(salaryChangesTable)
      .where(eq(salaryChangesTable.id, id))
      .returning();

    if (!deletedSalaryChange) {
      throw new ServerError(
        "SALARY_CHANGE_NOT_FOUND",
        `Salary change with ID ${id} not found`,
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

  private resolveSortField(
    field: SalaryChangeSortField,
    order: SortOrder,
  ) {
    const column =
      field === SalaryChangeSortField.NetAmount
        ? salaryChangesTable.netAmount
        : field === SalaryChangeSortField.CreatedAt
          ? salaryChangesTable.createdAt
          : salaryChangesTable.updatedAt;

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
    };

    return Math.round(numeric * 100);
  }

  private formatAmount(value: number): string {
    return value.toFixed(2);
  }

  private mapSalaryChangeToResponse(
    entity: typeof salaryChangesTable.$inferSelect,
  ): SalaryChangeResponse {
    return {
      id: entity.id,
      description: entity.description,
      netAmount: entity.netAmount,
      currencyCode: entity.currencyCode,
      createdAt: toISOStringSafe(entity.createdAt),
      updatedAt: toISOStringSafe(entity.updatedAt),
    };
  }
}

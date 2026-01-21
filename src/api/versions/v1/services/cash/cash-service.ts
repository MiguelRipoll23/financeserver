import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { cashTable, cashBalancesTable } from "../../../../../db/schema.ts";
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
import { CashSortField } from "../../enums/cash-sort-field-enum.ts";
import { CashBalanceSortField } from "../../enums/cash-balance-sort-field-enum.ts";
import { CashFilter } from "../../interfaces/cash/cash-filter-interface.ts";
import { CashSummary } from "../../interfaces/cash/cash-summary-interface.ts";
import { CashBalanceSummary } from "../../interfaces/cash/cash-balance-summary-interface.ts";
import type {
  CreateCashRequest,
  CreateCashResponse,
  UpdateCashRequest,
  UpdateCashResponse,
  GetCashResponse,
} from "../../schemas/cash-schemas.ts";
import type {
  CreateCashBalanceRequest,
  CreateCashBalanceResponse,
  GetCashBalancesResponse,
  UpdateCashBalanceRequest,
  UpdateCashBalanceResponse,
} from "../../schemas/cash-balances-schemas.ts";

@injectable()
export class CashService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createCash(
    payload: CreateCashRequest,
  ): Promise<CreateCashResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .insert(cashTable)
      .values({
        label: payload.label,
      })
      .returning();

    return this.mapCashToResponse(result);
  }

  public async updateCash(
    cashId: number,
    payload: UpdateCashRequest,
  ): Promise<UpdateCashResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .update(cashTable)
      .set({
        label: payload.label,
        updatedAt: new Date(),
      })
      .where(eq(cashTable.id, cashId))
      .returning();

    if (!result) {
      throw new ServerError(
        "CASH_NOT_FOUND",
        `Cash source with ID ${cashId} not found`,
        404,
      );
    }

    return this.mapCashToResponse(result);
  }

  public async deleteCash(cashId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(cashTable)
      .where(eq(cashTable.id, cashId))
      .returning({ id: cashTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "CASH_NOT_FOUND",
        `Cash source with ID ${cashId} not found`,
        404,
      );
    }
  }

  public async getCash(filter: CashFilter): Promise<GetCashResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;

    const sortField = filter.sortField ?? CashSortField.CreatedAt;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.label) {
      conditions.push(ilike(cashTable.label, `%${filter.label}%`));
    }

    const whereClause =
      conditions.length > 0 ? buildAndFilters(conditions) : undefined;

    const orderColumn = this.getSortColumn(sortField);
    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cashTable)
      .where(whereClause);

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        data: [],
        nextCursor: null,
      };
    }

    const results = await db
      .select()
      .from(cashTable)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const data: CashSummary[] = results.map((cash) =>
      this.mapCashToSummary(cash),
    );

    const pagination = createOffsetPagination<CashSummary>(
      data,
      pageSize,
      offset,
      total,
    );

    return {
      data: pagination.results,
      nextCursor: pagination.nextCursor,
    };
  }

  public async createCashBalance(
    payload: CreateCashBalanceRequest,
  ): Promise<CreateCashBalanceResponse> {
    const db = this.databaseService.get();
    const cashId = payload.cashId;

    // Verify cash source exists
    const cash = await db
      .select({ id: cashTable.id })
      .from(cashTable)
      .where(eq(cashTable.id, cashId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!cash) {
      throw new ServerError(
        "CASH_NOT_FOUND",
        `Cash source with ID ${cashId} not found`,
        404,
      );
    }

    const balanceString = this.validateAndFormatAmount(
      payload.balance,
      "INVALID_BALANCE",
      "Balance must be a valid monetary value",
    );

    const [result] = await db
      .insert(cashBalancesTable)
      .values({
        cashId: cashId,
        balance: balanceString,
        currencyCode: payload.currencyCode,
      })
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async getCashBalances(payload: {
    cashId: number;
    limit?: number;
    cursor?: string;
    sortField?: CashBalanceSortField;
    sortOrder?: SortOrder;
  }): Promise<GetCashBalancesResponse> {
    const db = this.databaseService.get();
    const cashId = payload.cashId;
    const pageSize = payload.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = payload.cursor;
    const sortField = payload.sortField ?? CashBalanceSortField.CreatedAt;
    const sortOrder = payload.sortOrder ?? SortOrder.Desc;

    // Verify cash source exists
    const cash = await db
      .select({ id: cashTable.id })
      .from(cashTable)
      .where(eq(cashTable.id, cashId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!cash) {
      throw new ServerError(
        "CASH_NOT_FOUND",
        `Cash source with ID ${cashId} not found`,
        404,
      );
    }

    const size = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = cursor ? decodeCursor(cursor) : 0;

    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;
    const orderColumn = this.getCashBalanceSortColumn(sortField);

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cashBalancesTable)
      .where(eq(cashBalancesTable.cashId, cashId));

    const count = countResult[0]?.count;

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        data: [],
        nextCursor: null,
      };
    }

    const results = await db
      .select()
      .from(cashBalancesTable)
      .where(eq(cashBalancesTable.cashId, cashId))
      .orderBy(
        orderDirection(orderColumn),
        orderDirection(cashBalancesTable.id),
      )
      .limit(size)
      .offset(offset);

    const data: CashBalanceSummary[] = results.map((row) =>
      this.mapBalanceToSummary(row),
    );

    const pagination = createOffsetPagination<CashBalanceSummary>(
      data,
      size,
      offset,
      total,
    );

    return {
      data: pagination.results,
      nextCursor: pagination.nextCursor,
    };
  }

  public async updateCashBalance(
    balanceId: number,
    payload: UpdateCashBalanceRequest,
  ): Promise<UpdateCashBalanceResponse> {
    const db = this.databaseService.get();

    // Verify balance exists
    const existingBalance = await db
      .select()
      .from(cashBalancesTable)
      .where(eq(cashBalancesTable.id, balanceId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingBalance) {
      throw new ServerError(
        "BALANCE_NOT_FOUND",
        `Balance with ID ${balanceId} not found`,
        404,
      );
    }

    const updateValues: {
      balance?: string;
      currencyCode?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.balance !== undefined) {
      updateValues.balance = this.validateAndFormatAmount(
        payload.balance,
        "INVALID_BALANCE",
        "Balance must be a valid monetary value",
      );
    }

    if (payload.currencyCode !== undefined) {
      updateValues.currencyCode = payload.currencyCode;
    }

    const [result] = await db
      .update(cashBalancesTable)
      .set(updateValues)
      .where(eq(cashBalancesTable.id, balanceId))
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async deleteCashBalance(balanceId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(cashBalancesTable)
      .where(eq(cashBalancesTable.id, balanceId))
      .returning({ id: cashBalancesTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "BALANCE_NOT_FOUND",
        `Balance with ID ${balanceId} not found`,
        404,
      );
    }
  }

  private getSortColumn(sortField: CashSortField) {
    switch (sortField) {
      case CashSortField.Label:
        return cashTable.label;
      case CashSortField.CreatedAt:
        return cashTable.createdAt;
      case CashSortField.UpdatedAt:
        return cashTable.updatedAt;
      default:
        return cashTable.createdAt;
    }
  }

  private getCashBalanceSortColumn(sortField: CashBalanceSortField) {
    switch (sortField) {
      case CashBalanceSortField.CreatedAt:
        return cashBalancesTable.createdAt;
      default:
        return cashBalancesTable.createdAt;
    }
  }

  private mapCashToResponse(
    cash: typeof cashTable.$inferSelect,
  ): CreateCashResponse {
    return {
      id: cash.id,
      label: cash.label,
      createdAt: toISOStringSafe(cash.createdAt),
      updatedAt: toISOStringSafe(cash.updatedAt),
    };
  }

  private mapCashToSummary(cash: typeof cashTable.$inferSelect): CashSummary {
    return {
      id: cash.id,
      label: cash.label,
      createdAt: toISOStringSafe(cash.createdAt),
      updatedAt: toISOStringSafe(cash.updatedAt),
    };
  }

  private mapBalanceToResponse(
    balance: typeof cashBalancesTable.$inferSelect,
  ): CreateCashBalanceResponse {
    return {
      id: balance.id,
      cashId: balance.cashId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapBalanceToSummary(
    balance: typeof cashBalancesTable.$inferSelect,
  ): CashBalanceSummary {
    return {
      id: balance.id,
      cashId: balance.cashId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private validateAndFormatAmount(
    amount: string,
    errorCode: string,
    errorMessage: string,
  ): string {
    const parsed = parseFloat(amount);

    if (isNaN(parsed) || parsed < 0) {
      throw new ServerError(errorCode, errorMessage, 400);
    }

    return parsed.toFixed(2);
  }
}

import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountsTable,
  bankAccountRoboadvisors,
  bankAccountRoboadvisorBalances,
  bankAccountRoboadvisorFunds,
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
import { BankAccountRoboadvisorSortField } from "../../enums/bank-account-roboadvisor-sort-field-enum.ts";
import { BankAccountRoboadvisorBalanceSortField } from "../../enums/bank-account-roboadvisor-balance-sort-field-enum.ts";
import { BankAccountRoboadvisorsFilter } from "../../interfaces/bank-account-roboadvisors/bank-account-roboadvisors-filter-interface.ts";
import { BankAccountRoboadvisorBalancesFilter } from "../../interfaces/bank-account-roboadvisors/bank-account-roboadvisor-balances-filter-interface.ts";
import { BankAccountRoboadvisorSummary } from "../../interfaces/bank-account-roboadvisors/bank-account-roboadvisor-summary-interface.ts";
import { BankAccountRoboadvisorBalanceSummary } from "../../interfaces/bank-account-roboadvisors/bank-account-roboadvisor-balance-summary-interface.ts";
import { BankAccountRoboadvisorFundSummary } from "../../interfaces/bank-account-roboadvisors/bank-account-roboadvisor-fund-summary-interface.ts";
import type {
  CreateBankAccountRoboadvisorRequest,
  CreateBankAccountRoboadvisorResponse,
  UpdateBankAccountRoboadvisorRequest,
  UpdateBankAccountRoboadvisorResponse,
  GetBankAccountRoboadvisorsResponse,
} from "../../schemas/bank-account-roboadvisors-schemas.ts";
import type {
  CreateBankAccountRoboadvisorBalanceRequest,
  CreateBankAccountRoboadvisorBalanceResponse,
  UpdateBankAccountRoboadvisorBalanceRequest,
  UpdateBankAccountRoboadvisorBalanceResponse,
  GetBankAccountRoboadvisorBalancesResponse,
} from "../../schemas/bank-account-roboadvisor-balances-schemas.ts";
import type {
  CreateBankAccountRoboadvisorFundRequest,
  CreateBankAccountRoboadvisorFundResponse,
  UpdateBankAccountRoboadvisorFundRequest,
  UpdateBankAccountRoboadvisorFundResponse,
  GetBankAccountRoboadvisorFundsResponse,
} from "../../schemas/bank-account-roboadvisor-funds-schemas.ts";

@injectable()
export class BankAccountRoboadvisorsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  // Roboadvisor CRUD operations
  public async createBankAccountRoboadvisor(
    payload: CreateBankAccountRoboadvisorRequest,
  ): Promise<CreateBankAccountRoboadvisorResponse> {
    const db = this.databaseService.get();

    // Verify bank account exists
    const account = await db
      .select({ id: bankAccountsTable.id })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, payload.bankAccountId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!account) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${payload.bankAccountId} not found`,
        404,
      );
    }

    const [result] = await db
      .insert(bankAccountRoboadvisors)
      .values({
        name: payload.name,
        bankAccountId: payload.bankAccountId,
        riskLevel: payload.riskLevel ?? null,
        managementFeePct: payload.managementFeePct,
        custodyFeePct: payload.custodyFeePct,
        fundTerPct: payload.fundTerPct,
        totalFeePct: payload.totalFeePct,
        managementFeeFrequency: payload.managementFeeFrequency,
        custodyFeeFrequency: payload.custodyFeeFrequency,
        terPricedInNav: payload.terPricedInNav ?? true,
      })
      .returning();

    return this.mapRoboadvisorToResponse(result);
  }

  public async getBankAccountRoboadvisors(
    filter: BankAccountRoboadvisorsFilter,
  ): Promise<GetBankAccountRoboadvisorsResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;
    const sortField =
      filter.sortField ?? BankAccountRoboadvisorSortField.CreatedAt;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.bankAccountId !== undefined) {
      conditions.push(
        eq(bankAccountRoboadvisors.bankAccountId, filter.bankAccountId),
      );
    }

    if (filter.name) {
      conditions.push(ilike(bankAccountRoboadvisors.name, `%${filter.name}%`));
    }

    const whereClause =
      conditions.length > 0 ? buildAndFilters(conditions) : undefined;

    const orderColumn = this.getRoboadvisorSortColumn(sortField);
    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bankAccountRoboadvisors)
      .where(whereClause);

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        results: [],
        limit: pageSize,
        offset: offset,
        total: 0,
        nextCursor: null,
        previousCursor: null,
      };
    }

    const results = await db
      .select()
      .from(bankAccountRoboadvisors)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const data: BankAccountRoboadvisorSummary[] = results.map((roboadvisor) =>
      this.mapRoboadvisorToSummary(roboadvisor),
    );

    const pagination = createOffsetPagination<BankAccountRoboadvisorSummary>(
      data,
      pageSize,
      offset,
      total,
    );

    return {
      results: pagination.results,
      limit: pagination.limit,
      offset: pagination.offset,
      total: pagination.total,
      nextCursor: pagination.nextCursor,
      previousCursor: pagination.previousCursor,
    };
  }

  public async updateBankAccountRoboadvisor(
    roboadvisorId: number,
    payload: UpdateBankAccountRoboadvisorRequest,
  ): Promise<UpdateBankAccountRoboadvisorResponse> {
    const db = this.databaseService.get();

    // Verify roboadvisor exists
    const existing = await db
      .select()
      .from(bankAccountRoboadvisors)
      .where(eq(bankAccountRoboadvisors.id, roboadvisorId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      throw new ServerError(
        "ROBOADVISOR_NOT_FOUND",
        `Roboadvisor with ID ${roboadvisorId} not found`,
        404,
      );
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateValues.name = payload.name;
    if (payload.riskLevel !== undefined)
      updateValues.riskLevel = payload.riskLevel;
    if (payload.managementFeePct !== undefined)
      updateValues.managementFeePct = payload.managementFeePct;
    if (payload.custodyFeePct !== undefined)
      updateValues.custodyFeePct = payload.custodyFeePct;
    if (payload.fundTerPct !== undefined)
      updateValues.fundTerPct = payload.fundTerPct;
    if (payload.totalFeePct !== undefined)
      updateValues.totalFeePct = payload.totalFeePct;
    if (payload.managementFeeFrequency !== undefined)
      updateValues.managementFeeFrequency = payload.managementFeeFrequency;
    if (payload.custodyFeeFrequency !== undefined)
      updateValues.custodyFeeFrequency = payload.custodyFeeFrequency;
    if (payload.terPricedInNav !== undefined)
      updateValues.terPricedInNav = payload.terPricedInNav;

    const [result] = await db
      .update(bankAccountRoboadvisors)
      .set(updateValues)
      .where(eq(bankAccountRoboadvisors.id, roboadvisorId))
      .returning();

    return this.mapRoboadvisorToResponse(result);
  }

  public async deleteBankAccountRoboadvisor(
    roboadvisorId: number,
  ): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountRoboadvisors)
      .where(eq(bankAccountRoboadvisors.id, roboadvisorId))
      .returning({ id: bankAccountRoboadvisors.id });

    if (result.length === 0) {
      throw new ServerError(
        "ROBOADVISOR_NOT_FOUND",
        `Roboadvisor with ID ${roboadvisorId} not found`,
        404,
      );
    }
  }

  // Roboadvisor Balance CRUD operations
  public async createBankAccountRoboadvisorBalance(
    payload: CreateBankAccountRoboadvisorBalanceRequest,
  ): Promise<CreateBankAccountRoboadvisorBalanceResponse> {
    const db = this.databaseService.get();

    // Verify roboadvisor exists
    const roboadvisor = await db
      .select({ id: bankAccountRoboadvisors.id })
      .from(bankAccountRoboadvisors)
      .where(eq(bankAccountRoboadvisors.id, payload.bankAccountRoboadvisorId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!roboadvisor) {
      throw new ServerError(
        "ROBOADVISOR_NOT_FOUND",
        `Roboadvisor with ID ${payload.bankAccountRoboadvisorId} not found`,
        404,
      );
    }

    const [result] = await db
      .insert(bankAccountRoboadvisorBalances)
      .values({
        bankAccountRoboadvisorId: payload.bankAccountRoboadvisorId,
        date: payload.date,
        type: payload.type,
        amount: payload.amount,
        currencyCode: payload.currencyCode,
      })
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async getBankAccountRoboadvisorBalances(
    filter: BankAccountRoboadvisorBalancesFilter,
  ): Promise<GetBankAccountRoboadvisorBalancesResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;
    const sortField =
      filter.sortField ?? BankAccountRoboadvisorBalanceSortField.Date;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.bankAccountRoboadvisorId !== undefined) {
      conditions.push(
        eq(
          bankAccountRoboadvisorBalances.bankAccountRoboadvisorId,
          filter.bankAccountRoboadvisorId,
        ),
      );
    }

    const whereClause =
      conditions.length > 0 ? buildAndFilters(conditions) : undefined;

    const orderColumn = this.getBalanceSortColumn(sortField);
    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bankAccountRoboadvisorBalances)
      .where(whereClause);

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        results: [],
        limit: pageSize,
        offset: offset,
        total: 0,
        nextCursor: null,
        previousCursor: null,
      };
    }

    const results = await db
      .select()
      .from(bankAccountRoboadvisorBalances)
      .where(whereClause)
      .orderBy(
        orderDirection(orderColumn),
        orderDirection(bankAccountRoboadvisorBalances.id),
      )
      .limit(pageSize)
      .offset(offset);

    const data: BankAccountRoboadvisorBalanceSummary[] = results.map(
      (balance) => this.mapBalanceToSummary(balance),
    );

    const pagination =
      createOffsetPagination<BankAccountRoboadvisorBalanceSummary>(
        data,
        pageSize,
        offset,
        total,
      );

    return {
      results: pagination.results,
      limit: pagination.limit,
      offset: pagination.offset,
      total: pagination.total,
      nextCursor: pagination.nextCursor,
      previousCursor: pagination.previousCursor,
    };
  }

  public async updateBankAccountRoboadvisorBalance(
    balanceId: number,
    payload: UpdateBankAccountRoboadvisorBalanceRequest,
  ): Promise<UpdateBankAccountRoboadvisorBalanceResponse> {
    const db = this.databaseService.get();

    // Verify balance exists
    const existing = await db
      .select()
      .from(bankAccountRoboadvisorBalances)
      .where(eq(bankAccountRoboadvisorBalances.id, balanceId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      throw new ServerError(
        "ROBOADVISOR_BALANCE_NOT_FOUND",
        `Roboadvisor balance with ID ${balanceId} not found`,
        404,
      );
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.date !== undefined) updateValues.date = payload.date;
    if (payload.type !== undefined) updateValues.type = payload.type;
    if (payload.amount !== undefined) updateValues.amount = payload.amount;
    if (payload.currencyCode !== undefined)
      updateValues.currencyCode = payload.currencyCode;

    const [result] = await db
      .update(bankAccountRoboadvisorBalances)
      .set(updateValues)
      .where(eq(bankAccountRoboadvisorBalances.id, balanceId))
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async deleteBankAccountRoboadvisorBalance(
    balanceId: number,
  ): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountRoboadvisorBalances)
      .where(eq(bankAccountRoboadvisorBalances.id, balanceId))
      .returning({ id: bankAccountRoboadvisorBalances.id });

    if (result.length === 0) {
      throw new ServerError(
        "ROBOADVISOR_BALANCE_NOT_FOUND",
        `Roboadvisor balance with ID ${balanceId} not found`,
        404,
      );
    }
  }

  // Roboadvisor Fund CRUD operations
  public async createBankAccountRoboadvisorFund(
    payload: CreateBankAccountRoboadvisorFundRequest,
  ): Promise<CreateBankAccountRoboadvisorFundResponse> {
    const db = this.databaseService.get();

    // Verify roboadvisor exists
    const roboadvisor = await db
      .select({ id: bankAccountRoboadvisors.id })
      .from(bankAccountRoboadvisors)
      .where(eq(bankAccountRoboadvisors.id, payload.bankAccountRoboadvisorId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!roboadvisor) {
      throw new ServerError(
        "ROBOADVISOR_NOT_FOUND",
        `Roboadvisor with ID ${payload.bankAccountRoboadvisorId} not found`,
        404,
      );
    }

    const [result] = await db
      .insert(bankAccountRoboadvisorFunds)
      .values({
        bankAccountRoboadvisorId: payload.bankAccountRoboadvisorId,
        name: payload.name,
        isin: payload.isin,
        assetClass: payload.assetClass,
        region: payload.region,
        fundCurrencyCode: payload.fundCurrencyCode,
        weight: payload.weight,
      })
      .returning();

    return this.mapFundToResponse(result);
  }

  public async getBankAccountRoboadvisorFunds(
    roboadvisorId: number,
  ): Promise<GetBankAccountRoboadvisorFundsResponse> {
    const db = this.databaseService.get();

    // Verify roboadvisor exists
    const roboadvisor = await db
      .select({ id: bankAccountRoboadvisors.id })
      .from(bankAccountRoboadvisors)
      .where(eq(bankAccountRoboadvisors.id, roboadvisorId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!roboadvisor) {
      throw new ServerError(
        "ROBOADVISOR_NOT_FOUND",
        `Roboadvisor with ID ${roboadvisorId} not found`,
        404,
      );
    }

    const results = await db
      .select()
      .from(bankAccountRoboadvisorFunds)
      .where(
        eq(bankAccountRoboadvisorFunds.bankAccountRoboadvisorId, roboadvisorId),
      )
      .orderBy(asc(bankAccountRoboadvisorFunds.name));

    const data: BankAccountRoboadvisorFundSummary[] = results.map((fund) =>
      this.mapFundToSummary(fund),
    );

    return {
      results: data,
    };
  }

  public async updateBankAccountRoboadvisorFund(
    fundId: number,
    payload: UpdateBankAccountRoboadvisorFundRequest,
  ): Promise<UpdateBankAccountRoboadvisorFundResponse> {
    const db = this.databaseService.get();

    // Verify fund exists
    const existing = await db
      .select()
      .from(bankAccountRoboadvisorFunds)
      .where(eq(bankAccountRoboadvisorFunds.id, fundId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) {
      throw new ServerError(
        "ROBOADVISOR_FUND_NOT_FOUND",
        `Roboadvisor fund with ID ${fundId} not found`,
        404,
      );
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateValues.name = payload.name;
    if (payload.isin !== undefined) updateValues.isin = payload.isin;
    if (payload.assetClass !== undefined)
      updateValues.assetClass = payload.assetClass;
    if (payload.region !== undefined) updateValues.region = payload.region;
    if (payload.fundCurrencyCode !== undefined)
      updateValues.fundCurrencyCode = payload.fundCurrencyCode;
    if (payload.weight !== undefined) updateValues.weight = payload.weight;

    const [result] = await db
      .update(bankAccountRoboadvisorFunds)
      .set(updateValues)
      .where(eq(bankAccountRoboadvisorFunds.id, fundId))
      .returning();

    return this.mapFundToResponse(result);
  }

  public async deleteBankAccountRoboadvisorFund(fundId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountRoboadvisorFunds)
      .where(eq(bankAccountRoboadvisorFunds.id, fundId))
      .returning({ id: bankAccountRoboadvisorFunds.id });

    if (result.length === 0) {
      throw new ServerError(
        "ROBOADVISOR_FUND_NOT_FOUND",
        `Roboadvisor fund with ID ${fundId} not found`,
        404,
      );
    }
  }

  // Private helper methods
  private getRoboadvisorSortColumn(sortField: BankAccountRoboadvisorSortField) {
    switch (sortField) {
      case BankAccountRoboadvisorSortField.Name:
        return bankAccountRoboadvisors.name;
      case BankAccountRoboadvisorSortField.CreatedAt:
        return bankAccountRoboadvisors.createdAt;
      case BankAccountRoboadvisorSortField.UpdatedAt:
        return bankAccountRoboadvisors.updatedAt;
      default:
        return bankAccountRoboadvisors.createdAt;
    }
  }

  private getBalanceSortColumn(
    sortField: BankAccountRoboadvisorBalanceSortField,
  ) {
    switch (sortField) {
      case BankAccountRoboadvisorBalanceSortField.Date:
        return bankAccountRoboadvisorBalances.date;
      case BankAccountRoboadvisorBalanceSortField.CreatedAt:
        return bankAccountRoboadvisorBalances.createdAt;
      default:
        return bankAccountRoboadvisorBalances.date;
    }
  }

  private mapRoboadvisorToResponse(
    roboadvisor: typeof bankAccountRoboadvisors.$inferSelect,
  ): CreateBankAccountRoboadvisorResponse {
    return {
      id: roboadvisor.id,
      name: roboadvisor.name,
      bankAccountId: roboadvisor.bankAccountId,
      riskLevel: roboadvisor.riskLevel,
      managementFeePct: roboadvisor.managementFeePct,
      custodyFeePct: roboadvisor.custodyFeePct,
      fundTerPct: roboadvisor.fundTerPct,
      totalFeePct: roboadvisor.totalFeePct,
      managementFeeFrequency: roboadvisor.managementFeeFrequency,
      custodyFeeFrequency: roboadvisor.custodyFeeFrequency,
      terPricedInNav: roboadvisor.terPricedInNav,
      createdAt: toISOStringSafe(roboadvisor.createdAt),
      updatedAt: toISOStringSafe(roboadvisor.updatedAt),
    };
  }

  private mapRoboadvisorToSummary(
    roboadvisor: typeof bankAccountRoboadvisors.$inferSelect,
  ): BankAccountRoboadvisorSummary {
    return {
      id: roboadvisor.id,
      name: roboadvisor.name,
      bankAccountId: roboadvisor.bankAccountId,
      riskLevel: roboadvisor.riskLevel,
      managementFeePct: roboadvisor.managementFeePct,
      custodyFeePct: roboadvisor.custodyFeePct,
      fundTerPct: roboadvisor.fundTerPct,
      totalFeePct: roboadvisor.totalFeePct,
      managementFeeFrequency: roboadvisor.managementFeeFrequency,
      custodyFeeFrequency: roboadvisor.custodyFeeFrequency,
      terPricedInNav: roboadvisor.terPricedInNav,
      createdAt: toISOStringSafe(roboadvisor.createdAt),
      updatedAt: toISOStringSafe(roboadvisor.updatedAt),
    };
  }

  private mapBalanceToResponse(
    balance: typeof bankAccountRoboadvisorBalances.$inferSelect,
  ): CreateBankAccountRoboadvisorBalanceResponse {
    return {
      id: balance.id,
      bankAccountRoboadvisorId: balance.bankAccountRoboadvisorId,
      date: balance.date,
      type: balance.type,
      amount: balance.amount,
      currencyCode: balance.currencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapBalanceToSummary(
    balance: typeof bankAccountRoboadvisorBalances.$inferSelect,
  ): BankAccountRoboadvisorBalanceSummary {
    return {
      id: balance.id,
      bankAccountRoboadvisorId: balance.bankAccountRoboadvisorId,
      date: balance.date,
      type: balance.type,
      amount: balance.amount,
      currencyCode: balance.currencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapFundToResponse(
    fund: typeof bankAccountRoboadvisorFunds.$inferSelect,
  ): CreateBankAccountRoboadvisorFundResponse {
    return {
      id: fund.id,
      bankAccountRoboadvisorId: fund.bankAccountRoboadvisorId,
      name: fund.name,
      isin: fund.isin,
      assetClass: fund.assetClass,
      region: fund.region,
      fundCurrencyCode: fund.fundCurrencyCode,
      weight: fund.weight,
      createdAt: toISOStringSafe(fund.createdAt),
      updatedAt: toISOStringSafe(fund.updatedAt),
    };
  }

  private mapFundToSummary(
    fund: typeof bankAccountRoboadvisorFunds.$inferSelect,
  ): BankAccountRoboadvisorFundSummary {
    return {
      id: fund.id,
      bankAccountRoboadvisorId: fund.bankAccountRoboadvisorId,
      name: fund.name,
      isin: fund.isin,
      assetClass: fund.assetClass,
      region: fund.region,
      fundCurrencyCode: fund.fundCurrencyCode,
      weight: fund.weight,
      createdAt: toISOStringSafe(fund.createdAt),
      updatedAt: toISOStringSafe(fund.updatedAt),
    };
  }
}

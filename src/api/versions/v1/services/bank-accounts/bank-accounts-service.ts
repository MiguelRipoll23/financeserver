import { inject, injectable } from "@needle-di/core";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountsTable,
  bankAccountBalancesTable,
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
import { BankAccountSortField } from "../../enums/bank-account-sort-field-enum.ts";
import { BankAccountsFilter } from "../../interfaces/bank-accounts/bank-accounts-filter-interface.ts";
import { BankAccountSummary } from "../../interfaces/bank-accounts/bank-account-summary-interface.ts";
import { BankAccountBalanceSummary } from "../../interfaces/bank-accounts/bank-account-balance-summary-interface.ts";
import type {
  CreateBankAccountRequest,
  CreateBankAccountResponse,
  UpdateBankAccountRequest,
  UpdateBankAccountResponse,
  GetBankAccountsResponse,
} from "../../schemas/bank-accounts-schemas.ts";
import type {
  CreateBankAccountBalanceRequest,
  CreateBankAccountBalanceResponse,
  GetBankAccountBalancesResponse,
  UpdateBankAccountBalanceRequest,
  UpdateBankAccountBalanceResponse,
} from "../../schemas/bank-account-balances-schemas.ts";

@injectable()
export class BankAccountsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createBankAccount(
    payload: CreateBankAccountRequest
  ): Promise<CreateBankAccountResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .insert(bankAccountsTable)
      .values({
        name: payload.name,
      })
      .returning();

    return this.mapBankAccountToResponse(result);
  }

  public async updateBankAccount(
    accountId: number,
    payload: UpdateBankAccountRequest
  ): Promise<UpdateBankAccountResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .update(bankAccountsTable)
      .set({
        name: payload.name,
        updatedAt: new Date(),
      })
      .where(eq(bankAccountsTable.id, accountId))
      .returning();

    if (!result) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${accountId} not found`,
        404
      );
    }

    return this.mapBankAccountToResponse(result);
  }

  public async deleteBankAccount(accountId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountsTable)
      .where(eq(bankAccountsTable.id, accountId))
      .returning({ id: bankAccountsTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${accountId} not found`,
        404
      );
    }
  }

  public async getBankAccounts(
    filter: BankAccountsFilter
  ): Promise<GetBankAccountsResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );

    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;

    const sortField = filter.sortField ?? BankAccountSortField.CreatedAt;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.name) {
      conditions.push(ilike(bankAccountsTable.name, `%${filter.name}%`));
    }

    const whereClause =
      conditions.length > 0 ? buildAndFilters(conditions) : undefined;

    const orderColumn = this.getSortColumn(sortField);
    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bankAccountsTable)
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
      .from(bankAccountsTable)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const data: BankAccountSummary[] = results.map((account) =>
      this.mapBankAccountToSummary(account)
    );

    const pagination = createOffsetPagination<BankAccountSummary>(
      data,
      pageSize,
      offset,
      total
    );

    return {
      data: pagination.results,
      nextCursor: pagination.nextCursor,
    };
  }

  public async createBankAccountBalance(
    payload: CreateBankAccountBalanceRequest
  ): Promise<CreateBankAccountBalanceResponse> {
    const db = this.databaseService.get();
    const accountId = payload.bankAccountId;

    // Verify bank account exists
    const account = await db
      .select({ id: bankAccountsTable.id })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, accountId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!account) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${accountId} not found`,
        404
      );
    }

    // Validate interest rate period if provided
    if (
      payload.interestRate &&
      payload.interestRateStartDate &&
      payload.interestRateEndDate
    ) {
      await this.validateNoOverlappingInterestRates(
        db,
        accountId,
        payload.interestRateStartDate,
        payload.interestRateEndDate,
        null
      );
    }

    const balanceString = this.validateAndFormatAmount(
      payload.balance,
      "INVALID_BALANCE",
      "Balance must be a valid monetary value"
    );

    const [result] = await db
      .insert(bankAccountBalancesTable)
      .values({
        bankAccountId: accountId,
        balance: balanceString,
        currencyCode: payload.currencyCode,
        interestRate: payload.interestRate ?? null,
        interestRateStartDate: payload.interestRateStartDate ?? null,
        interestRateEndDate: payload.interestRateEndDate ?? null,
      })
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async getBankAccountBalances(payload: {
    bankAccountId: number;
    limit?: number;
    cursor?: string;
    sortOrder?: SortOrder;
  }): Promise<GetBankAccountBalancesResponse> {
    const db = this.databaseService.get();
    const accountId = payload.bankAccountId;
    const pageSize = payload.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = payload.cursor;
    const sortOrder = payload.sortOrder ?? SortOrder.Desc;

    // Verify bank account exists
    const account = await db
      .select({ id: bankAccountsTable.id })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, accountId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!account) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${accountId} not found`,
        404
      );
    }

    const size = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = cursor ? decodeCursor(cursor) : 0;

    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bankAccountBalancesTable)
      .where(eq(bankAccountBalancesTable.bankAccountId, accountId));

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        data: [],
        nextCursor: null,
      };
    }

    const results = await db
      .select()
      .from(bankAccountBalancesTable)
      .where(eq(bankAccountBalancesTable.bankAccountId, accountId))
      .orderBy(orderDirection(bankAccountBalancesTable.createdAt))
      .limit(size)
      .offset(offset);

    const data: BankAccountBalanceSummary[] = results.map((balance) =>
      this.mapBalanceToSummary(balance)
    );

    const pagination = createOffsetPagination<BankAccountBalanceSummary>(
      data,
      size,
      offset,
      total
    );

    return {
      data: pagination.results,
      nextCursor: pagination.nextCursor,
    };
  }

  public async updateBankAccountBalance(
    balanceId: number,
    payload: UpdateBankAccountBalanceRequest
  ): Promise<UpdateBankAccountBalanceResponse> {
    const db = this.databaseService.get();

    // Verify balance exists
    const existingBalance = await db
      .select()
      .from(bankAccountBalancesTable)
      .where(eq(bankAccountBalancesTable.id, balanceId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingBalance) {
      throw new ServerError(
        "BALANCE_NOT_FOUND",
        `Balance with ID ${balanceId} not found`,
        404
      );
    }

    const accountId = existingBalance.bankAccountId;

    const updateValues: {
      balance?: string;
      currencyCode?: string;
      interestRate?: string | null;
      interestRateStartDate?: string | null;
      interestRateEndDate?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.balance !== undefined) {
      updateValues.balance = this.validateAndFormatAmount(
        payload.balance,
        "INVALID_BALANCE",
        "Balance must be a valid monetary value"
      );
    }

    if (payload.currencyCode !== undefined) {
      updateValues.currencyCode = payload.currencyCode;
    }

    if (payload.interestRate !== undefined) {
      updateValues.interestRate = payload.interestRate;
    }

    if (payload.interestRateStartDate !== undefined) {
      updateValues.interestRateStartDate = payload.interestRateStartDate;
    }

    if (payload.interestRateEndDate !== undefined) {
      updateValues.interestRateEndDate = payload.interestRateEndDate;
    }

    // Validate interest rate period if being updated
    const newStartDate =
      payload.interestRateStartDate ?? existingBalance.interestRateStartDate;
    const newEndDate =
      payload.interestRateEndDate ?? existingBalance.interestRateEndDate;
    const newRate = payload.interestRate ?? existingBalance.interestRate;

    if (newRate && newStartDate && newEndDate) {
      await this.validateNoOverlappingInterestRates(
        db,
        accountId,
        newStartDate,
        newEndDate,
        balanceId
      );
    }

    const [result] = await db
      .update(bankAccountBalancesTable)
      .set(updateValues)
      .where(eq(bankAccountBalancesTable.id, balanceId))
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async deleteBankAccountBalance(balanceId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountBalancesTable)
      .where(eq(bankAccountBalancesTable.id, balanceId))
      .returning({ id: bankAccountBalancesTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "BALANCE_NOT_FOUND",
        `Balance with ID ${balanceId} not found`,
        404
      );
    }
  }

  private async validateNoOverlappingInterestRates(
    db: NodePgDatabase<Record<string, never>>,
    bankAccountId: number,
    startDate: string,
    endDate: string,
    excludeBalanceId: number | null
  ): Promise<void> {
    // Check if the new period overlaps with any existing periods
    const conditions: SQL[] = [
      eq(bankAccountBalancesTable.bankAccountId, bankAccountId),
      sql`${bankAccountBalancesTable.interestRate} IS NOT NULL`,
      sql`${bankAccountBalancesTable.interestRateStartDate} IS NOT NULL`,
      sql`${bankAccountBalancesTable.interestRateEndDate} IS NOT NULL`,
      // Overlap condition: new period overlaps if:
      // new_start <= existing_end AND new_end >= existing_start
      sql`${startDate} <= ${bankAccountBalancesTable.interestRateEndDate}`,
      sql`${endDate} >= ${bankAccountBalancesTable.interestRateStartDate}`,
    ];

    // Exclude the current balance being updated
    if (excludeBalanceId !== null) {
      conditions.push(
        sql`${bankAccountBalancesTable.id} != ${excludeBalanceId}`
      );
    }

    const overlapping = await db
      .select({
        id: bankAccountBalancesTable.id,
        startDate: bankAccountBalancesTable.interestRateStartDate,
        endDate: bankAccountBalancesTable.interestRateEndDate,
      })
      .from(bankAccountBalancesTable)
      .where(and(...conditions))
      .limit(1);

    if (overlapping.length > 0) {
      const existing = overlapping[0];
      throw new ServerError(
        "OVERLAPPING_INTEREST_RATE_PERIOD",
        `Interest rate period ${startDate} to ${endDate} overlaps with existing period ${existing.startDate} to ${existing.endDate}`,
        400
      );
    }
  }

  private getSortColumn(sortField: BankAccountSortField) {
    switch (sortField) {
      case BankAccountSortField.Name:
        return bankAccountsTable.name;
      case BankAccountSortField.CreatedAt:
        return bankAccountsTable.createdAt;
      case BankAccountSortField.UpdatedAt:
        return bankAccountsTable.updatedAt;
      default:
        return bankAccountsTable.createdAt;
    }
  }

  private mapBankAccountToResponse(
    account: typeof bankAccountsTable.$inferSelect
  ): CreateBankAccountResponse {
    return {
      id: account.id,
      name: account.name,
      createdAt: toISOStringSafe(account.createdAt),
      updatedAt: toISOStringSafe(account.updatedAt),
    };
  }

  private mapBankAccountToSummary(
    account: typeof bankAccountsTable.$inferSelect
  ): BankAccountSummary {
    return {
      id: account.id,
      name: account.name,
      createdAt: toISOStringSafe(account.createdAt),
      updatedAt: toISOStringSafe(account.updatedAt),
    };
  }

  private mapBalanceToResponse(
    balance: typeof bankAccountBalancesTable.$inferSelect
  ): CreateBankAccountBalanceResponse {
    return {
      id: balance.id,
      bankAccountId: balance.bankAccountId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      interestRate: balance.interestRate,
      interestRateStartDate: balance.interestRateStartDate,
      interestRateEndDate: balance.interestRateEndDate,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapBalanceToSummary(
    balance: typeof bankAccountBalancesTable.$inferSelect
  ): BankAccountBalanceSummary {
    return {
      id: balance.id,
      bankAccountId: balance.bankAccountId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      interestRate: balance.interestRate,
      interestRateStartDate: balance.interestRateStartDate,
      interestRateEndDate: balance.interestRateEndDate,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private validateAndFormatAmount(
    amount: string,
    errorCode: string,
    errorMessage: string
  ): string {
    const parsed = parseFloat(amount);

    if (isNaN(parsed) || parsed < 0) {
      throw new ServerError(errorCode, errorMessage, 400);
    }

    return parsed.toFixed(2);
  }
}

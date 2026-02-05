import { inject, injectable } from "@needle-di/core";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  sql,
  type SQL,
  getTableColumns,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountsTable,
  bankAccountBalancesTable,
  bankAccountInterestRatesTable,
  bankAccountCalculationsTable,
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
import { BankAccountBalanceSortField } from "../../enums/bank-account-balance-sort-field-enum.ts";
import { BankAccountType } from "../../enums/bank-account-type-enum.ts";
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
    payload: CreateBankAccountRequest,
  ): Promise<CreateBankAccountResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .insert(bankAccountsTable)
      .values({
        name: payload.name,
        type: payload.type,
        taxPercentage:
          payload.taxPercentage === null || payload.taxPercentage === undefined
            ? null
            : payload.taxPercentage.toString(),
      })
      .returning();

    return this.mapBankAccountToResponse(result);
  }

  public async updateBankAccount(
    accountId: number,
    payload: UpdateBankAccountRequest,
  ): Promise<UpdateBankAccountResponse> {
    const db = this.databaseService.get();

    const updateValues: {
      name?: string;
      type?: BankAccountType;
      taxPercentage?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updateValues.name = payload.name;
    }

    if (payload.type !== undefined) {
      updateValues.type = payload.type;
    }

    if (payload.taxPercentage !== undefined) {
      updateValues.taxPercentage =
        payload.taxPercentage === null
          ? null
          : payload.taxPercentage.toString();
    }

    const [result] = await db
      .update(bankAccountsTable)
      .set(updateValues)
      .where(eq(bankAccountsTable.id, accountId))
      .returning();

    if (!result) {
      throw new ServerError(
        "BANK_ACCOUNT_NOT_FOUND",
        `Bank account with ID ${accountId} not found`,
        404,
      );
    }

    const [calculationData] = await db
      .select({
        latestCalculation: sql<{
          monthlyProfit: string;
          annualProfit: string;
          currencyCode: string;
          calculatedAt: string;
        } | null>`(
          SELECT json_build_object(
            'monthlyProfit', calc.monthly_profit,
            'annualProfit', calc.annual_profit,
            'currencyCode', calc.currency_code,
            'calculatedAt', calc.created_at
          )
          FROM ${bankAccountCalculationsTable} calc
          WHERE calc.bank_account_id = ${bankAccountsTable}.id
          ORDER BY calc.created_at DESC
          LIMIT 1
        )`,
      })
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, accountId))
      .limit(1);

    return this.mapBankAccountToSummary({
      ...result,
      latestCalculation: calculationData?.latestCalculation ?? null,
    });
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
        404,
      );
    }
  }

  public async getBankAccounts(
    filter: BankAccountsFilter,
  ): Promise<GetBankAccountsResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;

    const sortField = filter.sortField ?? BankAccountSortField.CreatedAt;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.name) {
      conditions.push(ilike(bankAccountsTable.name, `%${filter.name}%`));
    }

    if (filter.type) {
      conditions.push(eq(bankAccountsTable.type, filter.type));
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
        results: [],
        limit: pageSize,
        offset: offset,
        total: 0,
        nextCursor: null,
        previousCursor: null,
      };
    }

    const results = await db
      .select({
        ...getTableColumns(bankAccountsTable),
        latestCalculation: sql<{
          monthlyProfit: string;
          annualProfit: string;
          currencyCode: string;
          calculatedAt: string;
        } | null>`(
          SELECT json_build_object(
            'monthlyProfit', calc.monthly_profit,
            'annualProfit', calc.annual_profit,
            'currencyCode', calc.currency_code,
            'calculatedAt', calc.created_at
          )
          FROM ${bankAccountCalculationsTable} calc
          WHERE calc.bank_account_id = ${bankAccountsTable}.id
          ORDER BY calc.created_at DESC
          LIMIT 1
        )`,
      })
      .from(bankAccountsTable)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const data: BankAccountSummary[] = results.map((account) =>
      this.mapBankAccountToSummary(account),
    );

    const pagination = createOffsetPagination<BankAccountSummary>(
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

  public async createBankAccountBalance(
    payload: CreateBankAccountBalanceRequest,
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
        404,
      );
    }

    const balanceString = this.validateAndFormatAmount(
      payload.balance,
      "INVALID_BALANCE",
      "Balance must be a valid monetary value",
    );

    const [result] = await db
      .insert(bankAccountBalancesTable)
      .values({
        bankAccountId: accountId,
        balance: balanceString,
        currencyCode: payload.currencyCode,
      })
      .returning();

    return this.mapBalanceToResponse(result);
  }

  public async getBankAccountBalances(payload: {
    bankAccountId?: number;
    limit?: number;
    cursor?: string;
    sortField?: BankAccountBalanceSortField;
    sortOrder?: SortOrder;
  }): Promise<GetBankAccountBalancesResponse> {
    const db = this.databaseService.get();
    const accountId = payload.bankAccountId;
    const pageSize = payload.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = payload.cursor;
    const sortField =
      payload.sortField ?? BankAccountBalanceSortField.CreatedAt;
    const sortOrder = payload.sortOrder ?? SortOrder.Desc;

    // Verify bank account exists if accountId is provided
    if (accountId !== undefined) {
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
          404,
        );
      }
    }

    const size = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = cursor ? decodeCursor(cursor) : 0;

    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;
    const orderColumn =
      sortField === BankAccountBalanceSortField.InterestRate
        ? bankAccountInterestRatesTable.interestRate
        : bankAccountBalancesTable.createdAt;

    const countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bankAccountBalancesTable);

    if (accountId !== undefined) {
      countQuery.where(eq(bankAccountBalancesTable.bankAccountId, accountId));
    }

    const [{ count }] = await countQuery;

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        results: [],
        limit: size,
        offset: offset,
        total: 0,
        nextCursor: null,
        previousCursor: null,
      };
    }

    const query = db
      .select({
        ...getTableColumns(bankAccountBalancesTable),
        interestRate: bankAccountInterestRatesTable.interestRate,
      })
      .from(bankAccountBalancesTable)
      .leftJoin(
        bankAccountInterestRatesTable,
        and(
          eq(
            bankAccountInterestRatesTable.bankAccountId,
            bankAccountBalancesTable.bankAccountId,
          ),
          sql`${bankAccountBalancesTable.createdAt} >= ${bankAccountInterestRatesTable.interestRateStartDate}`,
          sql`(${bankAccountBalancesTable.createdAt} < (${bankAccountInterestRatesTable.interestRateEndDate} + interval '1 day') OR ${bankAccountInterestRatesTable.interestRateEndDate} IS NULL)`,
        ),
      );

    if (accountId !== undefined) {
      query.where(eq(bankAccountBalancesTable.bankAccountId, accountId));
    }

    const results = await query
      .orderBy(
        orderDirection(orderColumn),
        orderDirection(bankAccountBalancesTable.id),
      )
      .limit(size)
      .offset(offset);

    const data: BankAccountBalanceSummary[] = results.map((row) =>
      this.mapBalanceToSummary(row),
    );

    const pagination = createOffsetPagination<BankAccountBalanceSummary>(
      data,
      size,
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

  public async updateBankAccountBalance(
    balanceId: number,
    payload: UpdateBankAccountBalanceRequest,
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
        404,
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
    account: typeof bankAccountsTable.$inferSelect,
  ): CreateBankAccountResponse {
    return {
      id: account.id,
      name: account.name,
      type: account.type as BankAccountType,
      taxPercentage: account.taxPercentage
        ? parseFloat(account.taxPercentage)
        : null,
      createdAt: toISOStringSafe(account.createdAt),
      updatedAt: toISOStringSafe(account.updatedAt),
    };
  }

  private mapBankAccountToSummary(
    account: typeof bankAccountsTable.$inferSelect & {
      latestCalculation: {
        monthlyProfit: string;
        annualProfit: string;
        currencyCode: string;
        calculatedAt: string;
      } | null;
    },
  ): BankAccountSummary {
    return {
      id: account.id,
      name: account.name,
      type: account.type as BankAccountType,
      taxPercentage: account.taxPercentage
        ? parseFloat(account.taxPercentage)
        : null,
      createdAt: toISOStringSafe(account.createdAt),
      updatedAt: toISOStringSafe(account.updatedAt),
      latestCalculation: account.latestCalculation
        ? {
            monthlyProfit: account.latestCalculation.monthlyProfit.toString(),
            annualProfit: account.latestCalculation.annualProfit.toString(),
            currencyCode: account.latestCalculation.currencyCode,
            calculatedAt: toISOStringSafe(
              new Date(account.latestCalculation.calculatedAt)
            ),
          }
        : null,
    };
  }

  private mapBalanceToResponse(
    balance: typeof bankAccountBalancesTable.$inferSelect,
  ): CreateBankAccountBalanceResponse {
    return {
      id: balance.id,
      bankAccountId: balance.bankAccountId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapBalanceToSummary(
    balance: typeof bankAccountBalancesTable.$inferSelect & {
      interestRate?: string | null;
    },
  ): BankAccountBalanceSummary {
    return {
      id: balance.id,
      bankAccountId: balance.bankAccountId,
      balance: balance.balance,
      currencyCode: balance.currencyCode,
      // Preserve valid 0 values by explicitly checking for null/undefined
      interestRate:
        balance.interestRate !== null && balance.interestRate !== undefined
          ? parseFloat(balance.interestRate)
          : null,
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

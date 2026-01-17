import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, sql } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  cryptoExchangesTable,
  cryptoExchangeBalancesTable,
} from "../../../../../db/schema.ts";
import { ServerError } from "../../models/server-error.ts";
import { decodeCursor } from "../../utils/cursor-utils.ts";
import { createOffsetPagination } from "../../utils/pagination-utils.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../constants/pagination-constants.ts";
import { SortOrder } from "../../enums/sort-order-enum.ts";
import { CryptoExchangeBalanceSummary } from "../../interfaces/crypto-exchanges/crypto-exchange-balance-summary-interface.ts";
import type {
  CreateCryptoExchangeBalanceRequest,
  CreateCryptoExchangeBalanceResponse,
  GetCryptoExchangeBalancesResponse,
  UpdateCryptoExchangeBalanceRequest,
  UpdateCryptoExchangeBalanceResponse,
} from "../../schemas/crypto-exchange-balances-schemas.ts";


@injectable()
export class CryptoExchangeBalancesService {
  constructor(
    private databaseService = inject(DatabaseService),
  ) {}

  public async createCryptoExchangeBalance(
    exchangeId: number,
    payload: CreateCryptoExchangeBalanceRequest,
  ): Promise<CreateCryptoExchangeBalanceResponse> {
    const db = this.databaseService.get();

    const exchange = await db
      .select({ id: cryptoExchangesTable.id })
      .from(cryptoExchangesTable)
      .where(eq(cryptoExchangesTable.id, exchangeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!exchange) {
      throw new ServerError(
        "CRYPTO_EXCHANGE_NOT_FOUND",
        `Crypto exchange with ID ${exchangeId} not found`,
        404,
      );
    }

    const [result] = await db
      .insert(cryptoExchangeBalancesTable)
      .values({
        cryptoExchangeId: exchangeId,
        balance: payload.balance,
        symbolCode: payload.symbolCode,
        investedAmount: payload.investedAmount ?? null,
        investedCurrencyCode: payload.investedCurrencyCode ?? null,
      })
      .returning();



    return this.mapBalanceToResponse(result);
  }

  public async getCryptoExchangeBalances(payload: {
    cryptoExchangeId: number;
    limit?: number;
    cursor?: string;
    sortOrder?: SortOrder;
  }): Promise<GetCryptoExchangeBalancesResponse> {
    const db = this.databaseService.get();
    const exchangeId = payload.cryptoExchangeId;
    const pageSize = payload.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = payload.cursor;
    const sortOrder = payload.sortOrder ?? SortOrder.Desc;

    const exchange = await db
      .select({ id: cryptoExchangesTable.id })
      .from(cryptoExchangesTable)
      .where(eq(cryptoExchangesTable.id, exchangeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!exchange) {
      throw new ServerError(
        "CRYPTO_EXCHANGE_NOT_FOUND",
        `Crypto exchange with ID ${exchangeId} not found`,
        404,
      );
    }

    const size = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = cursor ? decodeCursor(cursor) : 0;

    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cryptoExchangeBalancesTable)
      .where(eq(cryptoExchangeBalancesTable.cryptoExchangeId, exchangeId));

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        data: [],
        nextCursor: null,
      };
    }

    const results = await db
      .select()
      .from(cryptoExchangeBalancesTable)
      .where(eq(cryptoExchangeBalancesTable.cryptoExchangeId, exchangeId))
      .orderBy(orderDirection(cryptoExchangeBalancesTable.createdAt))
      .limit(size)
      .offset(offset);

    const data: CryptoExchangeBalanceSummary[] = results.map((balance) =>
      this.mapBalanceToSummary(balance),
    );

    const pagination = createOffsetPagination<CryptoExchangeBalanceSummary>(
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

  public async updateCryptoExchangeBalance(
    balanceId: number,
    payload: UpdateCryptoExchangeBalanceRequest,
  ): Promise<UpdateCryptoExchangeBalanceResponse> {
    const db = this.databaseService.get();

    const existingBalance = await db
      .select({ id: cryptoExchangeBalancesTable.id })
      .from(cryptoExchangeBalancesTable)
      .where(eq(cryptoExchangeBalancesTable.id, balanceId))
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
      symbolCode?: string;
      investedAmount?: string | null;
      investedCurrencyCode?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.balance !== undefined) {
      updateValues.balance = payload.balance;
    }

    if (payload.symbolCode !== undefined) {
      updateValues.symbolCode = payload.symbolCode;
    }

    if (payload.investedAmount !== undefined) {
      updateValues.investedAmount = payload.investedAmount;
    }

    if (payload.investedCurrencyCode !== undefined) {
      updateValues.investedCurrencyCode = payload.investedCurrencyCode;
    }

    const [result] = await db
      .update(cryptoExchangeBalancesTable)
      .set(updateValues)
      .where(eq(cryptoExchangeBalancesTable.id, balanceId))
      .returning();



    return this.mapBalanceToResponse(result);
  }

  public async deleteCryptoExchangeBalance(balanceId: number): Promise<void> {
    const db = this.databaseService.get();

    // Verify balance exists before pushing telemetry
    const existing = await db
      .select({ id: cryptoExchangeBalancesTable.id })
      .from(cryptoExchangeBalancesTable)
      .where(eq(cryptoExchangeBalancesTable.id, balanceId))
      .limit(1);

    if (existing.length === 0) {
      throw new ServerError(
        "BALANCE_NOT_FOUND",
        `Balance with ID ${balanceId} not found`,
        404,
      );
    }



    await db
      .delete(cryptoExchangeBalancesTable)
      .where(eq(cryptoExchangeBalancesTable.id, balanceId));
  }

  private mapBalanceToResponse(
    balance: typeof cryptoExchangeBalancesTable.$inferSelect,
  ): CreateCryptoExchangeBalanceResponse {
    return {
      id: balance.id,
      cryptoExchangeId: balance.cryptoExchangeId,
      balance: balance.balance,
      symbolCode: balance.symbolCode,
      investedAmount: balance.investedAmount,
      investedCurrencyCode: balance.investedCurrencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }

  private mapBalanceToSummary(
    balance: typeof cryptoExchangeBalancesTable.$inferSelect,
  ): CryptoExchangeBalanceSummary {
    return {
      id: balance.id,
      cryptoExchangeId: balance.cryptoExchangeId,
      balance: balance.balance,
      symbolCode: balance.symbolCode,
      investedAmount: balance.investedAmount,
      investedCurrencyCode: balance.investedCurrencyCode,
      createdAt: toISOStringSafe(balance.createdAt),
      updatedAt: toISOStringSafe(balance.updatedAt),
    };
  }
}

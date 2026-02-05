import { inject, injectable } from "@needle-di/core";
import { asc, desc, eq, getTableColumns, ilike, sql, type SQL } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  cryptoExchangesTable,
  cryptoExchangeCalculationsTable,
  cryptoExchangeBalancesTable,
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
import { CryptoExchangeSortField } from "../../enums/crypto-exchange-sort-field-enum.ts";
import { CryptoExchangesFilter } from "../../interfaces/crypto-exchanges/crypto-exchanges-filter-interface.ts";
import { CryptoExchangeSummary } from "../../interfaces/crypto-exchanges/crypto-exchange-summary-interface.ts";
import type {
  CreateCryptoExchangeRequest,
  CreateCryptoExchangeResponse,
  UpdateCryptoExchangeRequest,
  UpdateCryptoExchangeResponse,
  GetCryptoExchangesResponse,
} from "../../schemas/crypto-exchanges-schemas.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchanges-balances/crypto-exchange-balances-service.ts";

@injectable()
export class CryptoExchangesService {
  constructor(
    private databaseService = inject(DatabaseService),
    private balancesService = inject(CryptoExchangeBalancesService),
  ) {}

  public async createCryptoExchange(
    payload: CreateCryptoExchangeRequest,
  ): Promise<CreateCryptoExchangeResponse> {
    const db = this.databaseService.get();

    const [result] = await db
      .insert(cryptoExchangesTable)
      .values({
        name: payload.name,
        // NOTE: using a truthy check here will convert an explicit 0 to null
        // (e.g. taxPercentage: 0 => null). Treat undefined/null as absent
        // and preserve explicit zeros by checking for null/undefined explicitly.
        taxPercentage: payload.taxPercentage != null
          ? payload.taxPercentage.toString()
          : null,
      })
      .returning();

    return this.mapCryptoExchangeToResponse(result);
  }

  public async updateCryptoExchange(
    exchangeId: number,
    payload: UpdateCryptoExchangeRequest,
  ): Promise<UpdateCryptoExchangeResponse> {
    const db = this.databaseService.get();

    const updateValues: {
      name?: string;
      taxPercentage?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updateValues.name = payload.name;
    }

    if (payload.taxPercentage !== undefined) {
      updateValues.taxPercentage =
        payload.taxPercentage === null
          ? null
          : payload.taxPercentage.toString();
    }

    const [result] = await db
      .update(cryptoExchangesTable)
      .set(updateValues)
      .where(eq(cryptoExchangesTable.id, exchangeId))
      .returning();

    if (!result) {
      throw new ServerError(
        "CRYPTO_EXCHANGE_NOT_FOUND",
        `Crypto exchange with ID ${exchangeId} not found`,
        404,
      );
    }

    if (payload.taxPercentage !== undefined) {
      (async () => {
        const db = this.databaseService.get();
        const balances = await db
          .select({ symbolCode: cryptoExchangeBalancesTable.symbolCode })
          .from(cryptoExchangeBalancesTable)
          .where(eq(cryptoExchangeBalancesTable.cryptoExchangeId, exchangeId));

        for (const balance of balances) {
          await this.balancesService.calculateCryptoValueAfterTax(
            exchangeId,
            balance.symbolCode,
            result,
          );
        }
      })().catch((error) => {
        console.error(
          `Failed to trigger async calculation for crypto exchange ${exchangeId}:`,
          error,
        );
      });
    }

    return this.mapCryptoExchangeToSummary({
      ...result,
      latestCalculation: null,
    });
  }

  public async deleteCryptoExchange(exchangeId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(cryptoExchangesTable)
      .where(eq(cryptoExchangesTable.id, exchangeId))
      .returning({ id: cryptoExchangesTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "CRYPTO_EXCHANGE_NOT_FOUND",
        `Crypto exchange with ID ${exchangeId} not found`,
        404,
      );
    }
  }

  public async getCryptoExchanges(
    filter: CryptoExchangesFilter,
  ): Promise<GetCryptoExchangesResponse> {
    const db = this.databaseService.get();

    const pageSize = Math.min(
      filter.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const offset = filter.cursor ? decodeCursor(filter.cursor) : 0;

    const sortField = filter.sortField ?? CryptoExchangeSortField.CreatedAt;
    const sortOrder = filter.sortOrder ?? SortOrder.Desc;

    const conditions: SQL[] = [];

    if (filter.name) {
      conditions.push(ilike(cryptoExchangesTable.name, `%${filter.name}%`));
    }

    const whereClause =
      conditions.length > 0 ? buildAndFilters(conditions) : undefined;

    const orderColumn = this.getSortColumn(sortField);
    const orderDirection = sortOrder === SortOrder.Asc ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cryptoExchangesTable)
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
        ...getTableColumns(cryptoExchangesTable),
        latestCalculation: sql<{
          currentValue: string;
          currencyCode: string;
          calculatedAt: string;
        } | null>`(
          SELECT json_build_object(
            'currentValue', calc.current_value,
            'currencyCode', bal.invested_currency_code,
            'calculatedAt', calc.created_at
          )
          FROM ${cryptoExchangeCalculationsTable} calc
          LEFT JOIN LATERAL (
            SELECT invested_currency_code
            FROM ${cryptoExchangeBalancesTable} ceb
            WHERE ceb.crypto_exchange_id = ${cryptoExchangesTable}.id
            ORDER BY ceb.created_at DESC
            LIMIT 1
          ) bal ON true
          WHERE calc.crypto_exchange_id = ${cryptoExchangesTable}.id
            AND bal.invested_currency_code IS NOT NULL
          ORDER BY calc.created_at DESC
          LIMIT 1
        )`,
      })
      .from(cryptoExchangesTable)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
      .limit(pageSize)
      .offset(offset);

    const data: CryptoExchangeSummary[] = results.map((exchange) =>
      this.mapCryptoExchangeToSummary(exchange),
    );

    const pagination = createOffsetPagination<CryptoExchangeSummary>(
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

  private getSortColumn(sortField: CryptoExchangeSortField) {
    switch (sortField) {
      case CryptoExchangeSortField.Name:
        return cryptoExchangesTable.name;
      case CryptoExchangeSortField.CreatedAt:
        return cryptoExchangesTable.createdAt;
      default:
        return cryptoExchangesTable.createdAt;
    }
  }

  private mapCryptoExchangeToResponse(
    exchange: typeof cryptoExchangesTable.$inferSelect,
  ): CreateCryptoExchangeResponse {
    return {
      id: exchange.id,
      name: exchange.name,
      taxPercentage: exchange.taxPercentage ? parseFloat(exchange.taxPercentage) : null,
      createdAt: toISOStringSafe(exchange.createdAt),
      updatedAt: toISOStringSafe(exchange.updatedAt),
    };
  }

  private mapCryptoExchangeToSummary(
    exchange: typeof cryptoExchangesTable.$inferSelect & {
      latestCalculation: {
        currentValue: string;
        currencyCode: string;
        calculatedAt: string;
      } | null;
    },
  ): CryptoExchangeSummary {
    return {
      id: exchange.id,
      name: exchange.name,
      taxPercentage: exchange.taxPercentage ? parseFloat(exchange.taxPercentage) : null,
      createdAt: toISOStringSafe(exchange.createdAt),
      updatedAt: toISOStringSafe(exchange.updatedAt),
      latestCalculation: exchange.latestCalculation
        ? {
            currentValue: exchange.latestCalculation.currentValue.toString(),
            currencyCode: exchange.latestCalculation.currencyCode,
            calculatedAt: toISOStringSafe(exchange.latestCalculation.calculatedAt),
          }
        : null,
    };
  }
}

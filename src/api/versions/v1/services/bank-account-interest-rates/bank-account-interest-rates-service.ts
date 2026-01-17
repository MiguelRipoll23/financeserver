import { inject, injectable } from "@needle-di/core";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountsTable,
  bankAccountInterestRatesTable,
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
import type {
  CreateBankAccountInterestRateRequest,
  CreateBankAccountInterestRateResponse,
  GetBankAccountInterestRatesResponse,
  UpdateBankAccountInterestRateRequest,
  UpdateBankAccountInterestRateResponse,
} from "../../schemas/bank-account-interest-rates-schemas.ts";
import type { BankAccountInterestRateSummarySchema } from "../../schemas/bank-account-interest-rates-schemas.ts";
import { z } from "zod";

type BankAccountInterestRateSummary = z.infer<
  typeof BankAccountInterestRateSummarySchema
>;

@injectable()
export class BankAccountInterestRatesService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createBankAccountInterestRate(
    payload: CreateBankAccountInterestRateRequest
  ): Promise<CreateBankAccountInterestRateResponse> {
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

    return await db.transaction(async (tx) => {
      // Validate interest rate period
      await this.validateNoOverlappingInterestRates(
        tx,
        accountId,
        payload.interestRateStartDate,
        payload.interestRateEndDate ?? "9999-12-31", // Treat null end date as far future for overlap check
        null
      );

      const [result] = await tx
        .insert(bankAccountInterestRatesTable)
        .values({
          bankAccountId: accountId,
          interestRate: payload.interestRate,
          interestRateStartDate: payload.interestRateStartDate,
          interestRateEndDate: payload.interestRateEndDate ?? null,
        })
        .returning();

      return this.mapInterestRateToResponse(result);
    });
  }

  public async getBankAccountInterestRates(payload: {
    bankAccountId: number;
    limit?: number;
    cursor?: string;
    sortOrder?: SortOrder;
  }): Promise<GetBankAccountInterestRatesResponse> {
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
      .from(bankAccountInterestRatesTable)
      .where(eq(bankAccountInterestRatesTable.bankAccountId, accountId));

    const total = Number(count ?? 0);

    if (total === 0) {
      return {
        data: [],
        nextCursor: null,
      };
    }

    const results = await db
      .select()
      .from(bankAccountInterestRatesTable)
      .where(eq(bankAccountInterestRatesTable.bankAccountId, accountId))
      .orderBy(
        orderDirection(bankAccountInterestRatesTable.createdAt),
        orderDirection(bankAccountInterestRatesTable.id)
      )
      .limit(size)
      .offset(offset);

    const data: BankAccountInterestRateSummary[] = results.map((rate) =>
      this.mapInterestRateToSummary(rate)
    );

    const pagination = createOffsetPagination<BankAccountInterestRateSummary>(
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

  public async updateBankAccountInterestRate(
    rateId: number,
    payload: UpdateBankAccountInterestRateRequest
  ): Promise<UpdateBankAccountInterestRateResponse> {
    const db = this.databaseService.get();

    // Verify rate exists
    const existingRate = await db
      .select()
      .from(bankAccountInterestRatesTable)
      .where(eq(bankAccountInterestRatesTable.id, rateId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingRate) {
      throw new ServerError(
        "INTEREST_RATE_NOT_FOUND",
        `Interest rate with ID ${rateId} not found`,
        404
      );
    }

    const accountId = existingRate.bankAccountId;

    const updateValues: {
      interestRate?: string;
      interestRateStartDate?: string;
      interestRateEndDate?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.interestRate !== undefined) {
      updateValues.interestRate = payload.interestRate;
    }

    if (payload.interestRateStartDate !== undefined) {
      updateValues.interestRateStartDate = payload.interestRateStartDate;
    }

    if (payload.interestRateEndDate !== undefined) {
      updateValues.interestRateEndDate = payload.interestRateEndDate;
    }

    return await db.transaction(async (tx) => {
      // Validate interest rate period if being updated
      const newStartDate =
        payload.interestRateStartDate ?? existingRate.interestRateStartDate;
      const newEndDate =
        payload.interestRateEndDate ?? existingRate.interestRateEndDate;

      // Treat null end date as far future
      const effectiveEndDate = newEndDate ?? "9999-12-31";

      if (
        payload.interestRateStartDate !== undefined ||
        payload.interestRateEndDate !== undefined
      ) {
        await this.validateNoOverlappingInterestRates(
          tx,
          accountId,
          newStartDate,
          effectiveEndDate,
          rateId
        );
      }

      const [result] = await tx
        .update(bankAccountInterestRatesTable)
        .set(updateValues)
        .where(eq(bankAccountInterestRatesTable.id, rateId))
        .returning();

      return this.mapInterestRateToResponse(result);
    });
  }

  public async deleteBankAccountInterestRate(rateId: number): Promise<void> {
    const db = this.databaseService.get();

    const result = await db
      .delete(bankAccountInterestRatesTable)
      .where(eq(bankAccountInterestRatesTable.id, rateId))
      .returning({ id: bankAccountInterestRatesTable.id });

    if (result.length === 0) {
      throw new ServerError(
        "INTEREST_RATE_NOT_FOUND",
        `Interest rate with ID ${rateId} not found`,
        404
      );
    }
  }

  private async validateNoOverlappingInterestRates(
    db: NodePgDatabase<Record<string, never>> | Parameters<Parameters<NodePgDatabase<Record<string, never>>['transaction']>[0]>[0],
    bankAccountId: number,
    startDate: string,
    endDate: string,
    excludeRateId: number | null
  ): Promise<void> {
    // Check if the new period overlaps with any existing periods
    const conditions: SQL[] = [
      eq(bankAccountInterestRatesTable.bankAccountId, bankAccountId),
      // Overlap condition:
      // new_start <= existing_end (or infinity) AND new_end (or infinity) >= existing_start
      
      // We need to handle null end dates in DB as infinity
      // Using COALESCE is one way, or logic
      
      // Complex overlap logic in SQL:
      // (start1 <= end2) and (end1 >= start2)
      // where end can be null (infinity)
      
      sql`
        (${startDate} <= COALESCE(${bankAccountInterestRatesTable.interestRateEndDate}, '9999-12-31'))
        AND
        (${endDate} >= ${bankAccountInterestRatesTable.interestRateStartDate})
      `
    ];

    if (excludeRateId !== null) {
      conditions.push(
        sql`${bankAccountInterestRatesTable.id} != ${excludeRateId}`
      );
    }

    const overlapping = await db
      .select({
        id: bankAccountInterestRatesTable.id,
        startDate: bankAccountInterestRatesTable.interestRateStartDate,
        endDate: bankAccountInterestRatesTable.interestRateEndDate,
      })
      .from(bankAccountInterestRatesTable)
      .where(and(...conditions))
      .limit(1);

    if (overlapping.length > 0) {
      const existing = overlapping[0];
      throw new ServerError(
        "OVERLAPPING_INTEREST_RATE_PERIOD",
        `Interest rate period ${startDate} to ${endDate} overlaps with existing period ${existing.startDate} to ${existing.endDate ?? "ongoing"}`,
        400
      );
    }
  }

  private mapInterestRateToResponse(
    rate: typeof bankAccountInterestRatesTable.$inferSelect
  ): CreateBankAccountInterestRateResponse {
    return {
      id: rate.id,
      bankAccountId: rate.bankAccountId,
      interestRate: rate.interestRate,
      interestRateStartDate: rate.interestRateStartDate,
      interestRateEndDate: rate.interestRateEndDate,
      createdAt: toISOStringSafe(rate.createdAt),
      updatedAt: toISOStringSafe(rate.updatedAt),
    };
  }

  private mapInterestRateToSummary(
    rate: typeof bankAccountInterestRatesTable.$inferSelect
  ): BankAccountInterestRateSummary {
    return {
      id: rate.id,
      bankAccountId: rate.bankAccountId,
      interestRate: rate.interestRate,
      interestRateStartDate: rate.interestRateStartDate,
      interestRateEndDate: rate.interestRateEndDate,
      createdAt: toISOStringSafe(rate.createdAt),
      updatedAt: toISOStringSafe(rate.updatedAt),
    };
  }
}

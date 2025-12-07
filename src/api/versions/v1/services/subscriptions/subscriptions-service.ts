import { inject, injectable } from "@needle-di/core";
import {
  asc,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL,
  and,
  isNull,
  or,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  subscriptionsTable,
  subscriptionPricesTable,
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
import { SubscriptionSortField } from "../../enums/subscription-sort-field-enum.ts";
import { SubscriptionsFilter } from "../../interfaces/subscriptions/subscriptions-filter-interface.ts";
import { SubscriptionSummary } from "../../interfaces/subscriptions/subscription-summary-interface.ts";
import type {
  GetSubscriptionsResponse,
  UpsertSubscriptionRequest,
  UpsertSubscriptionResponse,
} from "../../schemas/subscriptions-schemas.ts";
import { Recurrence } from "../../enums/recurrence-enum.ts";

@injectable()
export class SubscriptionsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async createSubscription(
    payload: UpsertSubscriptionRequest
  ): Promise<UpsertSubscriptionResponse> {
    this.validateSubscriptionPayload(payload);

    const db = this.databaseService.get();

    const amountCents = this.parseAmountToCents(
      payload.amount,
      "SUBSCRIPTION_AMOUNT_INVALID",
      "Subscription amount must be a non-negative monetary value"
    );
    const amountString = this.formatAmount(amountCents / 100);

    // Insert subscription
    const subscriptionValues = {
      name: payload.name.trim(),
      category: payload.category.trim(),
    };

    const [{ id: subscriptionId }] = await db
      .insert(subscriptionsTable)
      .values(subscriptionValues)
      .returning({ id: subscriptionsTable.id });

    // Insert initial price record
    const priceValues = {
      subscriptionId,
      recurrence: payload.recurrence,
      amount: amountString,
      currencyCode: payload.currencyCode,
      effectiveFrom: payload.effectiveFrom,
      effectiveUntil: payload.effectiveUntil || null,
      plan: payload.plan || null,
    };

    await db.insert(subscriptionPricesTable).values(priceValues);

    return await this.loadSubscriptionResponse(db, subscriptionId);
  }

  public async getSubscriptions(
    filters: SubscriptionsFilter
  ): Promise<GetSubscriptionsResponse> {
    const db = this.databaseService.get();
    const limit = this.resolveLimit(filters.limit);
    const offset = decodeCursor(filters.cursor);

    const conditions: SQL[] = [];

    if (filters.name) {
      const normalizedName = filters.name.trim().toLowerCase();
      conditions.push(
        sql`LOWER(${subscriptionsTable.name}) LIKE ${`%${normalizedName}%`}`
      );
    }

    if (filters.category) {
      const normalizedCategory = filters.category.trim().toLowerCase();
      conditions.push(
        sql`LOWER(${
          subscriptionsTable.category
        }) LIKE ${`%${normalizedCategory}%`}`
      );
    }

    if (filters.recurrence) {
      conditions.push(
        eq(subscriptionPricesTable.recurrence, filters.recurrence as Recurrence)
      );
    }

    if (filters.minimumAmount !== undefined) {
      const minimumCents = this.parseAmountToCents(
        filters.minimumAmount,
        "SUBSCRIPTION_MIN_AMOUNT_INVALID",
        "Minimum amount filter must be a non-negative monetary value"
      );

      conditions.push(
        gte(
          subscriptionPricesTable.amount,
          this.formatAmount(minimumCents / 100)
        )
      );
    }

    if (filters.maximumAmount !== undefined) {
      const maximumCents = this.parseAmountToCents(
        filters.maximumAmount,
        "SUBSCRIPTION_MAX_AMOUNT_INVALID",
        "Maximum amount filter must be a non-negative monetary value"
      );

      conditions.push(
        lte(
          subscriptionPricesTable.amount,
          this.formatAmount(maximumCents / 100)
        )
      );
    }

    // Date range filtering: include any price period that intersects the
    // requested range. That is: price.effective_from <= endDate AND
    // (price.effective_until IS NULL OR price.effective_until >= startDate)
    if (filters.startDate && filters.endDate) {
      const dateRangeCondition = and(
        sql`${subscriptionPricesTable.effectiveFrom} <= ${filters.endDate}`,
        or(
          isNull(subscriptionPricesTable.effectiveUntil),
          sql`${subscriptionPricesTable.effectiveUntil} >= ${filters.startDate}`
        )!
      );
      if (dateRangeCondition) {
        conditions.push(dateRangeCondition);
      }
    } else if (filters.startDate) {
      // Any price that hasn't ended before the startDate
      conditions.push(
        or(
          isNull(subscriptionPricesTable.effectiveUntil),
          sql`${subscriptionPricesTable.effectiveUntil} >= ${filters.startDate}`
        )!
      );
    } else if (filters.endDate) {
      // Any price that started on or before the endDate
      conditions.push(
        sql`${subscriptionPricesTable.effectiveFrom} <= ${filters.endDate}`
      );
    }

    if (filters.currencyCode) {
      conditions.push(
        eq(subscriptionPricesTable.currencyCode, filters.currencyCode)
      );
    }

    if (filters.isActive !== undefined) {
      if (filters.isActive) {
        // Active subscriptions: started and either no end date OR end date is in the future
        conditions.push(
          sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`
        );
        conditions.push(
          or(
            isNull(subscriptionPricesTable.effectiveUntil),
            sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`
          )!
        );
      } else {
        // Inactive subscriptions: end date is in the past
        conditions.push(
          sql`${subscriptionPricesTable.effectiveUntil} IS NOT NULL AND ${subscriptionPricesTable.effectiveUntil} < CURRENT_DATE`
        );
      }
    }

    // When no isActive filter is provided, get the most recent price for each subscription
    if (filters.isActive === undefined) {
      // Add condition to get the most recent price for each subscription
      conditions.push(
        sql`${subscriptionPricesTable.id} = (
          SELECT sp.id 
          FROM subscription_prices sp 
          WHERE sp.subscription_id = ${subscriptionsTable.id} 
          ORDER BY sp.effective_from DESC 
          LIMIT 1
        )`
      );
    }

    const predicate = buildAndFilters(conditions);

    // Use subquery to count distinct subscriptions
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${subscriptionsTable.id})` })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPricesTable,
        eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
      )
      .where(conditions.length > 0 ? predicate : undefined);

    const total = Number(count ?? 0);

    if (total === 0) {
      return createOffsetPagination<SubscriptionSummary>(
        [],
        limit,
        offset,
        total
      ) as GetSubscriptionsResponse;
    }

    const order = this.resolveSortField(
      filters.sortField ?? SubscriptionSortField.StartDate,
      filters.sortOrder ?? SortOrder.Desc
    );

    const rows = await db
      .select({
        subscription: subscriptionsTable,
        price: subscriptionPricesTable,
      })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPricesTable,
        eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
      )
      .where(conditions.length > 0 ? predicate : undefined)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const summaries: SubscriptionSummary[] = rows.map((row) => ({
      id: row.subscription.id,
      name: row.subscription.name,
      category: row.subscription.category,
      recurrence: row.price.recurrence,
      amount: this.formatStoredAmount(
        row.price.amount,
        "SUBSCRIPTION_AMOUNT_CORRUPTED",
        `Stored subscription amount for subscription ${row.subscription.id} is invalid`
      ),
      currencyCode: row.price.currencyCode,
      effectiveFrom: toISOStringSafe(row.price.effectiveFrom),
      effectiveUntil: row.price.effectiveUntil
        ? toISOStringSafe(row.price.effectiveUntil)
        : null,
      plan: row.price.plan,
      updatedAt: toISOStringSafe(row.subscription.updatedAt),
    }));

    return createOffsetPagination<SubscriptionSummary>(
      summaries,
      limit,
      offset,
      total
    ) as GetSubscriptionsResponse;
  }

  public async updateSubscription(
    id: number,
    payload: Partial<UpsertSubscriptionRequest>
  ): Promise<UpsertSubscriptionResponse> {
    const db = this.databaseService.get();

    const existingSubscription = await db
      .select({
        id: subscriptionsTable.id,
        name: subscriptionsTable.name,
        category: subscriptionsTable.category,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingSubscription) {
      throw new ServerError(
        "SUBSCRIPTION_NOT_FOUND",
        `Subscription ${id} was not found`,
        404
      );
    }

    // Check if we need to update basic info (name or category)
    const hasBasicInfoUpdate = payload.name || payload.category;
    if (hasBasicInfoUpdate) {
      const updateData: { name?: string; category?: string; updatedAt: Date } =
        { updatedAt: new Date() };

      if (payload.name) {
        if (payload.name.trim().length === 0) {
          throw new ServerError(
            "SUBSCRIPTION_NAME_REQUIRED",
            "Subscription name cannot be empty",
            400
          );
        }
        updateData.name = payload.name.trim();
      }

      if (payload.category) {
        if (payload.category.trim().length === 0) {
          throw new ServerError(
            "SUBSCRIPTION_CATEGORY_REQUIRED",
            "Subscription category cannot be empty",
            400
          );
        }
        updateData.category = payload.category.trim();
      }

      await db
        .update(subscriptionsTable)
        .set(updateData)
        .where(eq(subscriptionsTable.id, id));
    }

    // Check if we need to update price info
    const hasPriceUpdate =
      payload.amount ||
      payload.currencyCode ||
      payload.recurrence ||
      payload.effectiveFrom ||
      payload.effectiveUntil !== undefined ||
      payload.plan !== undefined;

    if (hasPriceUpdate) {
      // Get current active price to use as defaults
      const currentPrice = await db
        .select()
        .from(subscriptionPricesTable)
        .where(
          and(
            eq(subscriptionPricesTable.subscriptionId, id),
            sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
            or(
              isNull(subscriptionPricesTable.effectiveUntil),
              sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`
            )!
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      // Check if this is a cancellation operation (only effectiveUntil provided)
      const isCancellation =
        payload.effectiveUntil !== undefined &&
        !payload.amount &&
        !payload.currencyCode &&
        !payload.recurrence &&
        !payload.effectiveFrom &&
        payload.plan === undefined;

      if (isCancellation) {
        // Cancellation: just update the end date of the current active price
        if (!currentPrice) {
          throw new ServerError(
            "SUBSCRIPTION_NO_ACTIVE_PRICE",
            "No active price period found to cancel",
            404
          );
        }

        if (payload.effectiveUntil! < currentPrice.effectiveFrom) {
          throw new ServerError(
            "SUBSCRIPTION_INVALID_DATE_RANGE",
            "effectiveUntil must be greater than or equal to the current effectiveFrom",
            400
          );
        }

        await db.transaction(async (tx) => {
          await tx
            .update(subscriptionPricesTable)
            .set({
              effectiveUntil: payload.effectiveUntil,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionPricesTable.id, currentPrice.id));

          // Update subscription timestamp
          await tx
            .update(subscriptionsTable)
            .set({
              updatedAt: new Date(),
            })
            .where(eq(subscriptionsTable.id, id));
        });
      } else {
        // Regular price update: create a new price record
        if (!currentPrice && !payload.effectiveFrom) {
          throw new ServerError(
            "SUBSCRIPTION_EFFECTIVE_FROM_REQUIRED",
            "effectiveFrom is required when creating a new price period",
            400
          );
        }

        // Determine values for the new price record
        const amount = payload.amount || currentPrice?.amount;
        const currencyCode = payload.currencyCode || currentPrice?.currencyCode;
        const recurrence = payload.recurrence || currentPrice?.recurrence;
        const effectiveFrom =
          payload.effectiveFrom || currentPrice?.effectiveFrom;

        if (!amount || !currencyCode || !recurrence || !effectiveFrom) {
          throw new ServerError(
            "SUBSCRIPTION_PRICE_INFO_REQUIRED",
            "Missing required price information (amount, currencyCode, recurrence, effectiveFrom)",
            400
          );
        }

        // Validate amount
        const amountCents = this.parseAmountToCents(
          amount,
          "SUBSCRIPTION_AMOUNT_INVALID",
          "Subscription amount must be a non-negative monetary value"
        );
        const amountString = this.formatAmount(amountCents / 100);

        // Validate date range if effectiveUntil is provided
        if (payload.effectiveUntil && payload.effectiveUntil < effectiveFrom) {
          throw new ServerError(
            "SUBSCRIPTION_INVALID_DATE_RANGE",
            "effectiveUntil must be greater than or equal to effectiveFrom",
            400
          );
        }

        // End current price period and create new price record in a transaction
        await db.transaction(async (tx) => {
          // End current price period if there is one
          if (currentPrice) {
            const currentDate = new Date().toISOString().split("T")[0];
            await tx
              .update(subscriptionPricesTable)
              .set({
                effectiveUntil: currentDate,
                updatedAt: new Date(),
              })
              .where(eq(subscriptionPricesTable.id, currentPrice.id));
          }

          // Create new price record
          const priceValues = {
            subscriptionId: id,
            recurrence,
            amount: amountString,
            currencyCode,
            effectiveFrom,
            effectiveUntil: payload.effectiveUntil || null,
            plan:
              payload.plan !== undefined
                ? payload.plan
                : currentPrice?.plan || null,
          };

          await tx.insert(subscriptionPricesTable).values(priceValues);
        });
      }
    }

    return await this.loadSubscriptionResponse(db, id);
  }

  public async deleteSubscription(id: number): Promise<void> {
    const db = this.databaseService.get();

    const deleted = await db
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id))
      .returning({ id: subscriptionsTable.id });

    if (deleted.length === 0) {
      throw new ServerError(
        "SUBSCRIPTION_NOT_FOUND",
        `Subscription ${id} was not found`,
        404
      );
    }
  }

  public async saveSubscriptionEndDate(
    id: number,
    endDate: string
  ): Promise<UpsertSubscriptionResponse> {
    const db = this.databaseService.get();

    const existingSubscription = await db
      .select({ id: subscriptionsTable.id })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingSubscription) {
      throw new ServerError(
        "SUBSCRIPTION_NOT_FOUND",
        `Subscription ${id} was not found`,
        404
      );
    }

    // Update the current active price record end date
    const currentPrice = await db
      .select()
      .from(subscriptionPricesTable)
      .where(
        and(
          eq(subscriptionPricesTable.subscriptionId, id),
          sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
          or(
            isNull(subscriptionPricesTable.effectiveUntil),
            sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`
          )!
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (currentPrice) {
      await db
        .update(subscriptionPricesTable)
        .set({
          effectiveUntil: endDate,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPricesTable.id, currentPrice.id));
    }

    // Update subscription timestamp
    await db
      .update(subscriptionsTable)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.id, id));

    return await this.loadSubscriptionResponse(db, id);
  }

  private validateSubscriptionPayload(
    payload: UpsertSubscriptionRequest
  ): void {
    if (!payload.name || payload.name.trim().length === 0) {
      throw new ServerError(
        "SUBSCRIPTION_NAME_REQUIRED",
        "Subscription name is required",
        400
      );
    }

    if (!payload.category || payload.category.trim().length === 0) {
      throw new ServerError(
        "SUBSCRIPTION_CATEGORY_REQUIRED",
        "Subscription category is required",
        400
      );
    }

    if (!payload.amount || payload.amount.trim().length === 0) {
      throw new ServerError(
        "SUBSCRIPTION_AMOUNT_REQUIRED",
        "Subscription amount is required",
        400
      );
    }

    if (
      payload.effectiveUntil &&
      payload.effectiveUntil < payload.effectiveFrom
    ) {
      throw new ServerError(
        "SUBSCRIPTION_INVALID_DATE_RANGE",
        "Effective until date cannot be before effective from date",
        400
      );
    }

    if (payload.currencyCode && !/^[A-Z]{3}$/.test(payload.currencyCode)) {
      throw new ServerError(
        "SUBSCRIPTION_INVALID_CURRENCY_CODE",
        "Currency code must be a 3-letter uppercase code (e.g., EUR, USD)",
        400
      );
    }
  }

  private resolveLimit(requested?: number): number {
    if (!requested) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  }

  private async loadSubscriptionResponse(
    db: NodePgDatabase,
    id: number
  ): Promise<UpsertSubscriptionResponse> {
    // First try to get current/active price
    let result = await db
      .select({
        subscription: subscriptionsTable,
        price: subscriptionPricesTable,
      })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPricesTable,
        eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
      )
      .where(
        and(
          eq(subscriptionsTable.id, id),
          sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
          or(
            isNull(subscriptionPricesTable.effectiveUntil),
            sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`
          )!
        )
      )
      .orderBy(desc(subscriptionPricesTable.effectiveFrom))
      .limit(1)
      .then((rows) => rows[0]);

    // If no current price found, get the most recent price (including future ones)
    if (!result) {
      result = await db
        .select({
          subscription: subscriptionsTable,
          price: subscriptionPricesTable,
        })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPricesTable,
          eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
        )
        .where(eq(subscriptionsTable.id, id))
        .orderBy(desc(subscriptionPricesTable.effectiveFrom))
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!result) {
      throw new ServerError(
        "SUBSCRIPTION_NOT_FOUND",
        "Subscription could not be retrieved after persistence",
        500
      );
    }

    return {
      id: result.subscription.id,
      name: result.subscription.name,
      category: result.subscription.category,
      recurrence: result.price.recurrence,
      amount: this.formatStoredAmount(
        result.price.amount,
        "SUBSCRIPTION_AMOUNT_CORRUPTED",
        "Stored subscription amount is not a valid number"
      ),
      currencyCode: result.price.currencyCode,
      effectiveFrom: toISOStringSafe(result.price.effectiveFrom),
      effectiveUntil: result.price.effectiveUntil
        ? toISOStringSafe(result.price.effectiveUntil)
        : null,
      plan: result.price.plan,
      updatedAt: toISOStringSafe(result.subscription.updatedAt),
    } satisfies UpsertSubscriptionResponse;
  }

  private resolveSortField(field: SubscriptionSortField, order: SortOrder) {
    let column;

    switch (field) {
      case SubscriptionSortField.Name:
        column = subscriptionsTable.name;
        break;
      case SubscriptionSortField.Category:
        column = subscriptionsTable.category;
        break;
      case SubscriptionSortField.Recurrence:
        column = subscriptionPricesTable.recurrence;
        break;
      case SubscriptionSortField.Amount:
        column = subscriptionPricesTable.amount;
        break;
      case SubscriptionSortField.CurrencyCode:
        column = subscriptionPricesTable.currencyCode;
        break;
      case SubscriptionSortField.EndDate:
        column = subscriptionPricesTable.effectiveUntil;
        break;
      case SubscriptionSortField.StartDate:
      default:
        column = subscriptionPricesTable.effectiveFrom;
        break;
    }

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
}

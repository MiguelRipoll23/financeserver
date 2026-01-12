import { inject, injectable } from "@needle-di/core";
import { Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api";
import { OTelService } from "../otel-service.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  subscriptionsTable,
  subscriptionPricesTable,
} from "../../../../../db/schema.ts";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { SubscriptionMetric } from "../../interfaces/subscriptions/subscription-metric-interface.ts";
import { ActiveSubscription } from "../../interfaces/subscriptions/active-subscription-interface.ts";

@injectable()
export class SubscriptionsOTelService {
  private meter: Meter;
  private totalSubscriptionsGauge!: ObservableGauge;
  private activeSubscriptionsGauge!: ObservableGauge;
  private inactiveSubscriptionsGauge!: ObservableGauge;

  constructor(
    private otelService = inject(OTelService),
    private databaseService = inject(DatabaseService)
  ) {
    this.meter = this.otelService.getMeter("subscriptions-service");
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.totalSubscriptionsGauge = this.meter.createObservableGauge(
      "total_subscriptions",
      {
        description: "Total number of subscriptions in the system",
      }
    );

    this.totalSubscriptionsGauge.addCallback(async (observableResult) => {
      await this.reportTotalSubscriptions(observableResult);
    });

    this.activeSubscriptionsGauge = this.meter.createObservableGauge(
      "total_active_subscriptions",
      {
        description: "Number of active subscriptions",
      }
    );

    this.activeSubscriptionsGauge.addCallback(async (observableResult) => {
      await this.reportActiveSubscriptions(observableResult);
    });

    this.inactiveSubscriptionsGauge = this.meter.createObservableGauge(
      "total_inactive_subscriptions",
      {
        description: "Number of inactive subscriptions",
      }
    );

    this.inactiveSubscriptionsGauge.addCallback(async (observableResult) => {
      await this.reportInactiveSubscriptions(observableResult);
    });
  }

  private async reportTotalSubscriptions(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      const db = this.databaseService.get();
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subscriptionsTable);

      observableResult.observe(Number(count ?? 0));
    } catch (error) {
      console.error("Error reporting total subscriptions to OTel", error);
    }
  }

  private async reportActiveSubscriptions(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      console.log("[OTel] Collecting active subscriptions snapshot...");
      const activeSubscriptions = await this.fetchActiveSubscriptions();
      const aggregatedMetrics =
        this.aggregateSubscriptions(activeSubscriptions);
      this.reportMetrics(observableResult, aggregatedMetrics);
    } catch (error) {
      console.error("Error reporting active subscriptions to OTel", error);
    }
  }

  private async fetchActiveSubscriptions(): Promise<ActiveSubscription[]> {
    const db = this.databaseService.get();
    return await db
      .select({
        name: subscriptionsTable.name,
        plan: subscriptionPricesTable.plan,
        amount: subscriptionPricesTable.amount,
        currency: subscriptionPricesTable.currencyCode,
      })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPricesTable,
        eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
      )
      .where(
        and(
          sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
          or(
            isNull(subscriptionPricesTable.effectiveUntil),
            sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`
          ) ?? sql`FALSE`
        )
      );
  }

  private aggregateSubscriptions(
    subscriptions: ActiveSubscription[]
  ): Map<string, SubscriptionMetric> {
    const counts = new Map<string, SubscriptionMetric>();

    for (const subscription of subscriptions) {
      const key = this.buildAggregationKey(subscription);
      const existing = counts.get(key);

      if (existing) {
        existing.count++;
      } else {
        counts.set(key, {
          count: 1,
          name: subscription.name,
          plan: this.normalizePlan(subscription.plan),
          currency: subscription.currency,
        });
      }
    }

    return counts;
  }

  private buildAggregationKey(subscription: ActiveSubscription): string {
    const normalizedPlan = this.normalizePlan(subscription.plan);
    return `${subscription.name}|${normalizedPlan}|${subscription.currency}`;
  }

  private normalizePlan(plan: string | null): string {
    if (!plan || plan.trim() === "") {
      return "default";
    }
    // Normalize to lowercase for consistency
    return plan.toLowerCase().trim();
  }

  private reportMetrics(
    observableResult: ObservableResult,
    metrics: Map<string, SubscriptionMetric>
  ): void {
    for (const metric of metrics.values()) {
      observableResult.observe(metric.count, {
        "subscription.name": metric.name,
        "subscription.plan": metric.plan,
        "subscription.currency_code": metric.currency,
      });
    }
  }

  private async reportInactiveSubscriptions(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      const db = this.databaseService.get();
      const inactiveSubscriptions = await db
        .select({
          name: subscriptionsTable.name,
          plan: subscriptionPricesTable.plan,
          currency: subscriptionPricesTable.currencyCode,
        })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPricesTable,
          eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId)
        )
        .where(
          sql`${subscriptionPricesTable.effectiveUntil} IS NOT NULL AND ${subscriptionPricesTable.effectiveUntil} < CURRENT_DATE`
        );

      const counts = new Map<string, SubscriptionMetric>();

      for (const subscription of inactiveSubscriptions) {
        const normalizedPlan = this.normalizePlan(subscription.plan);
        const key = `${subscription.name}|${normalizedPlan}|${subscription.currency}`;
        const existing = counts.get(key);

        if (existing) {
          existing.count++;
        } else {
          counts.set(key, {
            count: 1,
            name: subscription.name,
            plan: normalizedPlan,
            currency: subscription.currency,
          });
        }
      }

      this.reportMetrics(observableResult, counts);
    } catch (error) {
      console.error("Error reporting inactive subscriptions to OTel", error);
    }
  }
}

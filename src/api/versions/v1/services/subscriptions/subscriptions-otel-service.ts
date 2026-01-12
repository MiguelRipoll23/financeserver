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
  private activeSubscriptionsGauge!: ObservableGauge;

  constructor(
    private otelService = inject(OTelService),
    private databaseService = inject(DatabaseService)
  ) {
    this.meter = this.otelService.getMeter("subscriptions-service");
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.activeSubscriptionsGauge = this.meter.createObservableGauge(
      "active_subscriptions",
      {
        description: "Number of active subscriptions",
      }
    );

    this.activeSubscriptionsGauge.addCallback(async (observableResult) => {
      await this.reportActiveSubscriptions(observableResult);
    });
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
          )!
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
          plan: subscription.plan,
          amount: subscription.amount,
          currency: subscription.currency,
        });
      }
    }

    return counts;
  }

  private buildAggregationKey(subscription: ActiveSubscription): string {
    return `${subscription.name}|${subscription.plan || ""}|${subscription.amount}|${subscription.currency}`;
  }

  private reportMetrics(
    observableResult: ObservableResult,
    metrics: Map<string, SubscriptionMetric>
  ): void {
    for (const metric of metrics.values()) {
      observableResult.observe(metric.count, {
        "subscription.name": metric.name,
        "subscription.plan": metric.plan || "default",
        "subscription.amount": Number(metric.amount),
        "subscription.currency_code": metric.currency,
      });
    }
  }
}

import { inject, injectable } from "@needle-di/core";
import {
  Counter,
  Meter,
  ObservableGauge,
  ObservableResult,
} from "@opentelemetry/api";
import { OTelService } from "../otel-service.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { billsTable, billCategoriesTable } from "../../../../../db/schema.ts";
import { eq, sql } from "drizzle-orm";

@injectable()
export class BillsOTelService {
  private meter: Meter;
  private billAmountCounter: Counter;
  private totalBillsGauge!: ObservableGauge;
  private billsByCategoryGauge!: ObservableGauge;

  constructor(
    private otelService = inject(OTelService),
    private databaseService = inject(DatabaseService)
  ) {
    this.meter = this.otelService.getMeter("bills-service");

    this.billAmountCounter = this.meter.createCounter("bills_amount_total", {
      description: "Total amount of bills processed",
    });

    this.initializeObservableMetrics();
  }

  private initializeObservableMetrics(): void {
    this.totalBillsGauge = this.meter.createObservableGauge("total_bills", {
      description: "Total number of bills in the system",
    });

    this.totalBillsGauge.addCallback(async (observableResult) => {
      await this.reportTotalBills(observableResult);
    });

    this.billsByCategoryGauge = this.meter.createObservableGauge(
      "bills_by_category",
      {
        description: "Number of bills per category",
      }
    );

    this.billsByCategoryGauge.addCallback(async (observableResult) => {
      await this.reportBillsByCategory(observableResult);
    });
  }

  private async reportTotalBills(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      const db = this.databaseService.get();
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(billsTable);

      observableResult.observe(Number(count ?? 0));
    } catch (error) {
      console.error("Error reporting total bills to OTel", error);
    }
  }

  private async reportBillsByCategory(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      const db = this.databaseService.get();
      const results = await db
        .select({
          category: billCategoriesTable.name,
          count: sql<number>`COUNT(*)`,
        })
        .from(billsTable)
        .innerJoin(
          billCategoriesTable,
          eq(billsTable.categoryId, billCategoriesTable.id)
        )
        .groupBy(billCategoriesTable.name);

      for (const result of results) {
        observableResult.observe(Number(result.count), {
          "bill.category": result.category,
        });
      }
    } catch (error) {
      console.error("Error reporting bills by category to OTel", error);
    }
  }

  public recordBill(
    category: string,
    amount: number,
    currencyCode: string
  ): void {
    this.billAmountCounter.add(amount, {
      "bill.category": category,
      "bill.currency_code": currencyCode,
    });
  }
}

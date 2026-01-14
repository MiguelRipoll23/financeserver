import { inject, injectable } from "@needle-di/core";
import { Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api";
import { desc, eq } from "drizzle-orm";
import { OTelService } from "../otel-service.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  cryptoExchangeBalancesTable,
  cryptoExchangesTable,
} from "../../../../../db/schema.ts";

@injectable()
export class CryptoExchangesOTelService {
  private meter: Meter;
  private totalBalanceGauge!: ObservableGauge;

  constructor(
    private otelService = inject(OTelService),
    private databaseService = inject(DatabaseService)
  ) {
    this.meter = this.otelService.getMeter("crypto-exchanges-service");
    this.initializeObservableMetrics();
  }

  private initializeObservableMetrics(): void {
    this.totalBalanceGauge = this.meter.createObservableGauge(
      "crypto_exchange_balance",
      {
        description: "Current balance of crypto exchanges",
      }
    );

    this.totalBalanceGauge.addCallback(async (observableResult) => {
      await this.reportTotalBalances(observableResult);
    });
  }

  private async reportTotalBalances(
    observableResult: ObservableResult
  ): Promise<void> {
    try {
      const db = this.databaseService.get();

      // Get latest balance for each exchange and symbol
      const results = await db
        .selectDistinctOn(
          [
            cryptoExchangeBalancesTable.cryptoExchangeId,
            cryptoExchangeBalancesTable.symbolCode,
          ],
          {
            balance: cryptoExchangeBalancesTable.balance,
            symbolCode: cryptoExchangeBalancesTable.symbolCode,
            exchangeName: cryptoExchangesTable.name,
          }
        )
        .from(cryptoExchangeBalancesTable)
        .innerJoin(
          cryptoExchangesTable,
          eq(
            cryptoExchangeBalancesTable.cryptoExchangeId,
            cryptoExchangesTable.id
          )
        )
        .orderBy(
          cryptoExchangeBalancesTable.cryptoExchangeId,
          cryptoExchangeBalancesTable.symbolCode,
          desc(cryptoExchangeBalancesTable.createdAt)
        );

      for (const result of results) {
        observableResult.observe(parseFloat(result.balance), {
          "crypto.exchange.name": result.exchangeName,
          "crypto.symbol": result.symbolCode,
        });
      }
    } catch (error) {
      console.error("Error reporting crypto exchange balances to OTel", error);
    }
  }
}

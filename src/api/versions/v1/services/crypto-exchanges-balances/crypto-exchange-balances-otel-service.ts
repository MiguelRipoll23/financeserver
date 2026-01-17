import { inject, injectable } from "@needle-di/core";
import { eq } from "drizzle-orm";
import type { UpDownCounter } from "@opentelemetry/api";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  cryptoExchangesTable,
  cryptoExchangeBalancesTable,
} from "../../../../../db/schema.ts";
import { OTelService } from "../otel-service.ts";

interface CryptoExchangeBalanceMetric {
  balanceId: number;
  balance: string;
  cryptoExchangeName: string;
  symbolCode: string;
  investedAmount: string | null;
  investedCurrencyCode: string | null;
}

@injectable()
export class CryptoExchangeBalancesOTelService {
  private static readonly METER_NAME = "crypto-exchanges";
  private static readonly COUNTER_NAME = "balance";

  private counter: UpDownCounter | null = null;

  constructor(
    private databaseService = inject(DatabaseService),
    private otelService = inject(OTelService),
  ) {
    this.otelService.registerDomainService(this);
  }

  private async getOrCreateCounter() {
    if (this.counter) {
      return this.counter;
    }

    const meterProvider = await this.otelService.getMeterProvider();
    if (!meterProvider) {
      return null;
    }

    const meter = meterProvider.getMeter(
      CryptoExchangeBalancesOTelService.METER_NAME,
    );
    this.counter = meter.createUpDownCounter(
      CryptoExchangeBalancesOTelService.COUNTER_NAME,
      {
        description: "Crypto exchange balance metric",
      },
    );

    return this.counter;
  }

  public async pushBalanceMetric(balanceId: number): Promise<void> {
    const counter = await this.getOrCreateCounter();
    if (!counter) {
      return;
    }

    const metric = await this.collectBalanceMetric(balanceId);
    if (!metric) {
      return;
    }

    counter.add(parseFloat(metric.balance), {
      balance_id: metric.balanceId.toString(),
      crypto_exchange_name: metric.cryptoExchangeName,
      symbol_code: metric.symbolCode,
      invested_amount: metric.investedAmount ?? "0",
      invested_currency_code: metric.investedCurrencyCode ?? "none",
    });

    await this.otelService.forceFlush();
  }

  public async pushAllMetrics(): Promise<void> {
    const counter = await this.getOrCreateCounter();
    if (!counter) {
      return;
    }

    const db = this.databaseService.get();

    const balances = await db
      .select({ id: cryptoExchangeBalancesTable.id })
      .from(cryptoExchangeBalancesTable);

    for (const balance of balances) {
      const metric = await this.collectBalanceMetric(balance.id);
      if (metric) {
        counter.add(parseFloat(metric.balance), {
          balance_id: metric.balanceId.toString(),
          crypto_exchange_name: metric.cryptoExchangeName,
          symbol_code: metric.symbolCode,
          invested_amount: metric.investedAmount ?? "0",
          invested_currency_code: metric.investedCurrencyCode ?? "none",
        });
      }
    }

    await this.otelService.forceFlush();
  }

  private async collectBalanceMetric(
    balanceId: number,
  ): Promise<CryptoExchangeBalanceMetric | null> {
    const db = this.databaseService.get();

    const result = await db
      .select({
        balanceId: cryptoExchangeBalancesTable.id,
        balance: cryptoExchangeBalancesTable.balance,
        cryptoExchangeName: cryptoExchangesTable.name,
        symbolCode: cryptoExchangeBalancesTable.symbolCode,
        investedAmount: cryptoExchangeBalancesTable.investedAmount,
        investedCurrencyCode: cryptoExchangeBalancesTable.investedCurrencyCode,
      })
      .from(cryptoExchangeBalancesTable)
      .innerJoin(
        cryptoExchangesTable,
        eq(
          cryptoExchangeBalancesTable.cryptoExchangeId,
          cryptoExchangesTable.id,
        ),
      )
      .where(eq(cryptoExchangeBalancesTable.id, balanceId))
      .limit(1);

    return result[0] ?? null;
  }
}

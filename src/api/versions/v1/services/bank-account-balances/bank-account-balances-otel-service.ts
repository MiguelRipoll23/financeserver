import { inject, injectable } from "@needle-di/core";
import { eq } from "drizzle-orm";
import type { Counter } from "@opentelemetry/api";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountsTable,
  bankAccountBalancesTable,
} from "../../../../../db/schema.ts";
import { OTelService } from "../otel-service.ts";

interface BankAccountBalanceMetric {
  balanceId: number;
  balance: string;
  bankAccountName: string;
  currencyCode: string;
  interestRate: string | null;
}

@injectable()
export class BankAccountBalancesOTelService {
  private static readonly METER_NAME = "bank-accounts";
  private static readonly COUNTER_NAME = "balance";

  private counter: Counter | null = null;

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
      BankAccountBalancesOTelService.METER_NAME,
    );
    this.counter = meter.createCounter(
      BankAccountBalancesOTelService.COUNTER_NAME,
      {
        description: "Bank account balance metric",
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
      bank_account_name: metric.bankAccountName,
      currency_code: metric.currencyCode,
      interest_rate: metric.interestRate ?? "0",
    });

    await this.otelService.forceFlush();
  }

  public async pushAllBalanceMetrics(): Promise<void> {
    const db = this.databaseService.get();

    const balances = await db
      .select({ id: bankAccountBalancesTable.id })
      .from(bankAccountBalancesTable);

    for (const balance of balances) {
      await this.pushBalanceMetric(balance.id);
    }
  }

  private async collectBalanceMetric(
    balanceId: number,
  ): Promise<BankAccountBalanceMetric | null> {
    const db = this.databaseService.get();

    const result = await db
      .select({
        balanceId: bankAccountBalancesTable.id,
        balance: bankAccountBalancesTable.balance,
        bankAccountName: bankAccountsTable.name,
        currencyCode: bankAccountBalancesTable.currencyCode,
        interestRate: bankAccountBalancesTable.interestRate,
      })
      .from(bankAccountBalancesTable)
      .innerJoin(
        bankAccountsTable,
        eq(bankAccountBalancesTable.bankAccountId, bankAccountsTable.id),
      )
      .where(eq(bankAccountBalancesTable.id, balanceId))
      .limit(1);

    return result[0] ?? null;
  }
}

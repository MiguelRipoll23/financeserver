import { inject, injectable } from "@needle-di/core";
import { Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api";
import { desc, eq } from "drizzle-orm";
import { OTelService } from "../otel-service.ts";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountBalancesTable,
  bankAccountsTable,
} from "../../../../../db/schema.ts";

@injectable()
export class BankAccountsOTelService {
  private meter: Meter;
  private totalBalanceGauge!: ObservableGauge;

  constructor(
    private otelService = inject(OTelService),
    private databaseService = inject(DatabaseService)
  ) {
    this.meter = this.otelService.getMeter("bank-accounts-service");
    this.initializeObservableMetrics();
  }

  private initializeObservableMetrics(): void {
    this.totalBalanceGauge = this.meter.createObservableGauge(
      "bank_account_balance",
      {
        description: "Current balance of bank accounts",
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

      // Get latest balance for each account
      const results = await db
        .selectDistinctOn([bankAccountBalancesTable.bankAccountId], {
          balance: bankAccountBalancesTable.balance,
          currencyCode: bankAccountBalancesTable.currencyCode,
          interestRate: bankAccountBalancesTable.interestRate,
          bankName: bankAccountsTable.name,
        })
        .from(bankAccountBalancesTable)
        .innerJoin(
          bankAccountsTable,
          eq(bankAccountBalancesTable.bankAccountId, bankAccountsTable.id)
        )
        .orderBy(
          bankAccountBalancesTable.bankAccountId,
          desc(bankAccountBalancesTable.createdAt)
        );

      for (const result of results) {
        observableResult.observe(parseFloat(result.balance), {
          "bank.name": result.bankName,
          "currency.code": result.currencyCode,
          ...(result.interestRate
            ? { "interest.rate": result.interestRate }
            : {}),
        });
      }
    } catch (error) {
      console.error("Error reporting bank account balances to OTel", error);
    }
  }
}

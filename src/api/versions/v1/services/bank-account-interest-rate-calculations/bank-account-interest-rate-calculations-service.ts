import { inject, injectable } from "@needle-di/core";
import { desc, eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountInterestRateCalculationsTable,
  bankAccountsTable,
} from "../../../../../db/schema.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";

@injectable()
export class BankAccountInterestRateCalculationsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getLatestCalculation(
    bankAccountId: number
  ): Promise<{
    monthlyProfitAfterTax: string;
    annualProfitAfterTax: string;
    createdAt: string;
  } | null> {
    const db = this.databaseService.get();

    const [calculation] = await db
      .select()
      .from(bankAccountInterestRateCalculationsTable)
      .where(
        eq(
          bankAccountInterestRateCalculationsTable.bankAccountId,
          bankAccountId
        )
      )
      .orderBy(desc(bankAccountInterestRateCalculationsTable.createdAt))
      .limit(1);

    if (!calculation) {
      return null;
    }

    return {
      monthlyProfitAfterTax: calculation.monthlyProfitAfterTax,
      annualProfitAfterTax: calculation.annualProfitAfterTax,
      createdAt: toISOStringSafe(calculation.createdAt),
    };
  }

  public async storeCalculation(
    bankAccountId: number,
    monthlyProfitAfterTax: string,
    annualProfitAfterTax: string
  ): Promise<void> {
    const db = this.databaseService.get();

    await db.insert(bankAccountInterestRateCalculationsTable).values({
      bankAccountId,
      monthlyProfitAfterTax,
      annualProfitAfterTax,
    });
  }
}

import { inject, injectable } from "@needle-di/core";
import { desc, eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { bankAccountCalculationsTable } from "../../../../../db/schema.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";

@injectable()
export class BankAccountCalculationsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getLatestCalculation(bankAccountId: number): Promise<
    {
      monthlyProfit: string;
      annualProfit: string;
      currencyCode: string;
      createdAt: string;
    } | null
  > {
    const db = this.databaseService.get();

    const [calculation] = await db
      .select()
      .from(bankAccountCalculationsTable)
      .where(eq(bankAccountCalculationsTable.bankAccountId, bankAccountId))
      .orderBy(desc(bankAccountCalculationsTable.createdAt))
      .limit(1);

    if (!calculation) {
      return null;
    }

    return {
      monthlyProfit: calculation.monthlyProfit,
      annualProfit: calculation.annualProfit,
      currencyCode: calculation.currencyCode,
      createdAt: toISOStringSafe(calculation.createdAt),
    };
  }

  public async storeCalculation(
    bankAccountId: number,
    monthlyProfit: string,
    annualProfit: string,
    currencyCode: string,
  ): Promise<void> {
    const db = this.databaseService.get();

    await db
      .insert(bankAccountCalculationsTable)
      .values({
        bankAccountId,
        monthlyProfit,
        annualProfit,
        currencyCode,
      })
      .onConflictDoUpdate({
        target: [bankAccountCalculationsTable.bankAccountId],
        set: {
          monthlyProfit,
          annualProfit,
          currencyCode,
          updatedAt: new Date(),
        },
      });
  }
}

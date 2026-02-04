import { inject, injectable } from "@needle-di/core";
import { desc, eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { bankAccountRoboadvisorFundCalculationsTable } from "../../../../../db/schema.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";

@injectable()
export class BankAccountRoboadvisorFundCalculationsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getLatestCalculation(
    roboadvisorId: number
  ): Promise<{
    currentValueAfterTax: string;
    createdAt: string;
  } | null> {
    const db = this.databaseService.get();

    const [calculation] = await db
      .select()
      .from(bankAccountRoboadvisorFundCalculationsTable)
      .where(
        eq(
          bankAccountRoboadvisorFundCalculationsTable.roboadvisorId,
          roboadvisorId
        )
      )
      .orderBy(desc(bankAccountRoboadvisorFundCalculationsTable.createdAt))
      .limit(1);

    if (!calculation) {
      return null;
    }

    return {
      currentValueAfterTax: calculation.currentValueAfterTax,
      createdAt: toISOStringSafe(calculation.createdAt),
    };
  }

  public async storeCalculation(
    roboadvisorId: number,
    currentValueAfterTax: string
  ): Promise<void> {
    const db = this.databaseService.get();

    await db.insert(bankAccountRoboadvisorFundCalculationsTable).values({
      roboadvisorId: roboadvisorId,
      currentValueAfterTax,
    });
  }
}

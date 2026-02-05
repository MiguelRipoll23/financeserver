import { inject, injectable } from "@needle-di/core";
import { desc, eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { roboadvisorFundCalculationsTable } from "../../../../../db/schema.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";

@injectable()
export class BankAccountRoboadvisorFundCalculationsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getLatestCalculation(
    roboadvisorId: number
  ): Promise<{
    currentValue: string;
    createdAt: string;
  } | null> {
    const db = this.databaseService.get();

    const [calculation] = await db
      .select()
      .from(roboadvisorFundCalculationsTable)
      .where(
        eq(
          roboadvisorFundCalculationsTable.roboadvisorId,
          roboadvisorId
        )
      )
      .orderBy(desc(roboadvisorFundCalculationsTable.createdAt))
      .limit(1);

    if (!calculation) {
      return null;
    }

    return {
      currentValue: calculation.currentValue,
      createdAt: toISOStringSafe(calculation.createdAt),
    };
  }

  public async storeCalculation(
    roboadvisorId: number,
    currentValue: string
  ): Promise<void> {
    const db = this.databaseService.get();

    await db.insert(roboadvisorFundCalculationsTable).values({
      roboadvisorId: roboadvisorId,
      currentValue,
    });
  }
}

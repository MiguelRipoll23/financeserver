import { inject, injectable } from "@needle-di/core";
import { and, desc, eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { cryptoExchangeCalculationsTable } from "../../../../../db/schema.ts";
import { toISOStringSafe } from "../../utils/date-utils.ts";

@injectable()
export class CryptoExchangeCalculationsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getLatestCalculation(
    cryptoExchangeId: number,
    symbolCode: string,
  ): Promise<
    {
      currentValue: string;
      createdAt: string;
    } | null
  > {
    const db = this.databaseService.get();

    const [calculation] = await db
      .select()
      .from(cryptoExchangeCalculationsTable)
      .where(
        and(
          eq(
            cryptoExchangeCalculationsTable.cryptoExchangeId,
            cryptoExchangeId,
          ),
          eq(cryptoExchangeCalculationsTable.symbolCode, symbolCode),
        ),
      )
      .orderBy(desc(cryptoExchangeCalculationsTable.createdAt))
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
    cryptoExchangeId: number,
    symbolCode: string,
    currentValue: string,
  ): Promise<void> {
    const db = this.databaseService.get();

    await db.insert(cryptoExchangeCalculationsTable).values({
      cryptoExchangeId,
      symbolCode,
      currentValue,
    });
  }
}

import { inject, injectable } from "@needle-di/core";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { userSettingsTable } from "../../../../../db/schema.ts";
import type {
  GetSettingsResponse,
  UpdateSettingsRequest,
} from "../../schemas/settings-schemas.ts";

@injectable()
export class SettingsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getSettings(): Promise<GetSettingsResponse> {
    const db = this.databaseService.get();
    const rows = await db.select().from(userSettingsTable).limit(1);

    if (rows.length === 0) {
      return { defaultCheckingAccountId: null, autoCalculateBalance: true };
    }

    const row = rows[0];
    return {
      defaultCheckingAccountId: row.defaultCheckingAccountId ?? null,
      autoCalculateBalance: row.autoCalculateBalance,
    };
  }

  public async updateSettings(
    payload: UpdateSettingsRequest,
  ): Promise<GetSettingsResponse> {
    const db = this.databaseService.get();
    const existing = await db.select().from(userSettingsTable).limit(1);

    if (existing.length === 0) {
      const insertValues: typeof userSettingsTable.$inferInsert = {
        autoCalculateBalance: payload.autoCalculateBalance ?? true,
        defaultCheckingAccountId: payload.defaultCheckingAccountId ?? null,
      };
      const [inserted] = await db
        .insert(userSettingsTable)
        .values(insertValues)
        .returning();
      return {
        defaultCheckingAccountId: inserted.defaultCheckingAccountId ?? null,
        autoCalculateBalance: inserted.autoCalculateBalance,
      };
    }

    const row = existing[0];
    const updateValues: Partial<typeof userSettingsTable.$inferInsert> & {
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (payload.autoCalculateBalance !== undefined) {
      updateValues.autoCalculateBalance = payload.autoCalculateBalance;
    }
    if (payload.defaultCheckingAccountId !== undefined) {
      updateValues.defaultCheckingAccountId =
        payload.defaultCheckingAccountId ?? null;
    }

    const [updated] = await db
      .update(userSettingsTable)
      .set(updateValues)
      .where(eq(userSettingsTable.id, row.id))
      .returning();

    return {
      defaultCheckingAccountId: updated.defaultCheckingAccountId ?? null,
      autoCalculateBalance: updated.autoCalculateBalance,
    };
  }
}

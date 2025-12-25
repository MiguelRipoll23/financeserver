import { inject, injectable } from "@needle-di/core";
import { eq, ilike } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { merchantsTable } from "../../../../../db/schema.ts";

@injectable()
export class MerchantsService {
  constructor(private databaseService = inject(DatabaseService)) {}

  public async getOrCreateMerchantId(
    db: NodePgDatabase,
    merchant?: { name?: string }
  ): Promise<number | undefined> {
    if (!merchant?.name) {
      return undefined;
    }
    const merchantName = merchant.name.trim();
    if (merchantName === "") {
      return undefined;
    }
    await db
      .insert(merchantsTable)
      .values({ name: merchantName })
      .onConflictDoNothing();
    const existingMerchant = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(ilike(merchantsTable.name, merchantName))
      .limit(1)
      .then((rows) => rows[0]);
    return existingMerchant?.id;
  }

  public async getMerchantInfo(
    db: NodePgDatabase,
    merchantId?: number | null
  ): Promise<{ id: number; name: string } | undefined> {
    if (!merchantId) return undefined;
    const merchant = await db
      .select({ id: merchantsTable.id, name: merchantsTable.name })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId))
      .limit(1)
      .then((rows) => rows[0]);
    return merchant;
  }
}

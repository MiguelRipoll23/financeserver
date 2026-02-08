import { inject, injectable } from "@needle-di/core";
import { sql } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { JWTService } from "../../../../../core/services/jwt-service.ts";
import { passkeysTable } from "../../../../../db/schema.ts";

@injectable()
export class PasskeySetupService {
  constructor(
    private databaseService = inject(DatabaseService),
    private jwtService = inject(JWTService),
  ) {}

  public async checkSetup(requestUrl: string) {
    const hasPasskeys = await this.hasPasskeys();

    if (hasPasskeys) {
      return null; // Return null to signal 204 response
    }

    const token = await this.jwtService.createSetupToken(requestUrl);
    return { token };
  }

  private async hasPasskeys(): Promise<boolean> {
    const result = await this.databaseService
      .get()
      .select({ count: sql<number>`count(*)` })
      .from(passkeysTable);

    return Number(result[0].count) > 0;
  }
}

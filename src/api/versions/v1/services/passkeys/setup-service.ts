import { inject, injectable } from "@needle-di/core";
import { sql } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { JWTService } from "../../../../../core/services/jwt-service.ts";
import { passkeysTable } from "../../../../../db/schema.ts";
import { UrlUtils } from "../../../../../core/utils/url-utils.ts";

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

    const token = await this.createSetupToken(requestUrl);
    return { token };
  }

  private async hasPasskeys(): Promise<boolean> {
    const result = await this.databaseService
      .get()
      .select({ count: sql<number>`count(*)` })
      .from(passkeysTable);

    return Number(result[0].count) > 0;
  }

  public async createSetupToken(requestUrl: string) {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);
    const now = Math.floor(Date.now() / 1000);

    return await this.jwtService.sign(
      {
        id: "setup",
        name: "Setup",
        // Restrict to registration endpoints only for first passkey setup
        aud: `${applicationBaseURL}/api/v1/registration/*`,
        exp: now + 15 * 60, // 15 minutes
      },
      15 * 60, // 15 minutes
    );
  }
}

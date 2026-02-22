import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { ServerError } from "../../api/versions/v1/models/server-error.ts";
import { injectable } from "@needle-di/core";
import { sql } from "drizzle-orm/sql";
import { ENV_DATABASE_URL } from "../../api/versions/v1/constants/environment-constants.ts";

@injectable()
export class DatabaseService {
  private database: NodePgDatabase | null = null;

  public init(): void {
    const databaseUrl = Deno.env.get(ENV_DATABASE_URL);

    if (!databaseUrl) {
      throw new ServerError(
        "BAD_SERVER_CONFIGURATION",
        "Database URL is not set in environment variables",
        500,
      );
    }

    this.database = drizzle(databaseUrl);
    console.log("Database connection opened");
  }

  public get(): NodePgDatabase {
    if (this.database === null) {
      throw new ServerError(
        "DATABASE_NOT_INITIALIZED",
        "Database has not been initialized",
        500,
      );
    }

    return this.database;
  }

  public executeWithRlsClient<T>(
    clientId: string,
    fn: (tx: NodePgDatabase) => Promise<T>,
  ): Promise<T> {
    return this.get().transaction(async (tx) => {
      await tx.execute(sql.raw(`SET app.client_id = '${clientId}'`));

      return await fn(tx);
    });
  }
}

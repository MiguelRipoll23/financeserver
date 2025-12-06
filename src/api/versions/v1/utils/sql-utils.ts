import { SQL, sql } from "drizzle-orm";

export const buildAndFilters = (conditions: SQL[]): SQL =>
  conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;

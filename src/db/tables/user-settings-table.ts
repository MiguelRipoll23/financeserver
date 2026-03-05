import {
  bigint,
  bigserial,
  boolean,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const userSettingsTable = pgTable("user_settings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  defaultCheckingAccountId: bigint("default_checking_account_id", {
    mode: "number",
  }).references(() => bankAccountsTable.id, { onDelete: "set null" }),
  autoCalculateBalance: boolean("auto_calculate_balance")
    .notNull()
    .default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserSettingsEntity = typeof userSettingsTable.$inferSelect;
export type UserSettingsInsertEntity = typeof userSettingsTable.$inferInsert;

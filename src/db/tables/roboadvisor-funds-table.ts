import {
  bigint,
  bigserial,
  decimal,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { roboadvisors } from "./roboadvisors-table.ts";

export const roboadvisorFunds = pgTable("roboadvisor_funds", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  roboadvisorId: bigint("roboadvisor_id", {
    mode: "number",
  })
    .references(() => roboadvisors.id, { onDelete: "cascade" })
    .notNull(),

  name: varchar("name", { length: 255 }).notNull(),

  isin: varchar("isin", { length: 12 }).notNull(),

  assetClass: varchar("asset_class", { length: 50 }).notNull(), // equity, bonds

  region: varchar("region", { length: 50 }).notNull(), // US, Europe, EM

  fundCurrencyCode: varchar("fund_currency_code", { length: 3 }).notNull(),

  weight: decimal("weight", {
    precision: 8,
    scale: 6,
  }).notNull(), // 0.39 = 39%

  shareCount: decimal("share_count", {
    precision: 20,
    scale: 8,
  }), // Number of shares/units held (can be fractional)

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

import {
  pgTable,
  varchar,
  decimal,
  timestamp,
  bigserial,
  bigint,
} from "drizzle-orm/pg-core";
import { bankAccountRoboadvisors } from "./bank-account-roboadvisors-table.ts";

export const bankAccountRoboadvisorFunds = pgTable(
  "bank_account_roboadvisor_funds",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    bankAccountRoboadvisorId: bigint("bank_account_roboadvisor_id", {
      mode: "number",
    })
      .references(() => bankAccountRoboadvisors.id)
      .notNull(),

    name: varchar("name", { length: 255 }).notNull(),

    isin: varchar("isin", { length: 12 }).notNull(),

    assetClass: varchar("asset_class", { length: 50 }).notNull(), // equity, bonds

    region: varchar("region", { length: 50 }).notNull(), // US, Europe, EM

    fundCurrencyCode: varchar("fund_currency_code", { length: 3 }).notNull(),

    weight: decimal("weight", {
      precision: 6,
      scale: 5,
    }).notNull(), // 0.39 = 39%

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

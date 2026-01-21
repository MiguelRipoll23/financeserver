import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { cashTable } from "./cash-table.ts";

export const cashBalancesTable = pgTable(
  "cash_balances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cashId: bigint("cash_id", { mode: "number" })
      .notNull()
      .references(() => cashTable.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cash_balances_cash_id_idx").on(table.cashId),
    index("cash_balances_created_at_idx").on(table.createdAt),
  ]
);

export type CashBalanceEntity = typeof cashBalancesTable.$inferSelect;
export type CashBalanceInsertEntity = typeof cashBalancesTable.$inferInsert;

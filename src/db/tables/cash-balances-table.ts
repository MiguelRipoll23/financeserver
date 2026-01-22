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
    // Composite index for filtered queries (per cash)
    index("idx_cash_balances_cash_created").on(table.cashId, table.createdAt.desc()),
    // Index for full table scans (Dashboard load)
    index("idx_cash_balances_created").on(table.createdAt.desc()),
  ]
);

export type CashBalanceEntity = typeof cashBalancesTable.$inferSelect;
export type CashBalanceInsertEntity = typeof cashBalancesTable.$inferInsert;

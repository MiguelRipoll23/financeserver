import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { cryptoExchangesTable } from "./crypto-exchanges-table.ts";

export const cryptoExchangeBalancesTable = pgTable(
  "crypto_exchange_balances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cryptoExchangeId: bigint("crypto_exchange_id", { mode: "number" })
      .notNull()
      .references(() => cryptoExchangesTable.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 20, scale: 8 }).notNull(),
    symbolCode: varchar("symbol_code", { length: 10 }).notNull(),
    investedAmount: numeric("invested_amount", { precision: 15, scale: 2 }),
    investedCurrencyCode: varchar("invested_currency_code", {
      length: 3,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite index for filtered queries (per exchange)
    index("idx_crypto_balances_exchange_created").on(
      table.cryptoExchangeId,
      table.createdAt.desc(),
    ),
    // Index for full table scans (Dashboard load)
    index("idx_crypto_balances_created").on(table.createdAt.desc()),
  ],
);

export type CryptoExchangeBalanceEntity =
  typeof cryptoExchangeBalancesTable.$inferSelect;
export type CryptoExchangeBalanceInsertEntity =
  typeof cryptoExchangeBalancesTable.$inferInsert;

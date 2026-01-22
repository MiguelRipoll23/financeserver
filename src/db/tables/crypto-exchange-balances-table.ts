import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    index("crypto_exchange_balances_crypto_exchange_id_idx").on(
      table.cryptoExchangeId
    ),
    index("crypto_exchange_balances_symbol_code_idx").on(table.symbolCode),
    index("crypto_exchange_balances_created_at_idx").on(table.createdAt),
    index("crypto_exchange_balances_composite_idx").on(
      table.cryptoExchangeId,
      sql`${table.createdAt} DESC`
    ),
  ]
);

export type CryptoExchangeBalanceEntity =
  typeof cryptoExchangeBalancesTable.$inferSelect;
export type CryptoExchangeBalanceInsertEntity =
  typeof cryptoExchangeBalancesTable.$inferInsert;

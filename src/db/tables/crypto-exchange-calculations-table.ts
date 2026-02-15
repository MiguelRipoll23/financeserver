import {
  bigint,
  bigserial,
  index,
  uniqueIndex,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { cryptoExchangesTable } from "./crypto-exchanges-table.ts";

export const cryptoExchangeCalculationsTable = pgTable(
  "crypto_exchange_calculations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cryptoExchangeId: bigint("crypto_exchange_id", { mode: "number" })
      .notNull()
      .references(() => cryptoExchangesTable.id, { onDelete: "cascade" }),
    symbolCode: varchar("symbol_code", { length: 10 }).notNull(),
    currentValue: numeric("current_value", {
      precision: 15,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_crypto_calcs_exchange_symbol").on(
      table.cryptoExchangeId,
      table.symbolCode,
    ),
    index("idx_crypto_calcs_exchange_symbol_created").on(
      table.cryptoExchangeId,
      table.symbolCode,
      table.createdAt.desc()
    ),
  ]
);

export type CryptoExchangeCalculationEntity =
  typeof cryptoExchangeCalculationsTable.$inferSelect;
export type CryptoExchangeCalculationInsertEntity =
  typeof cryptoExchangeCalculationsTable.$inferInsert;

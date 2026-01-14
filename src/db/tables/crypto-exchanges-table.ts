import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cryptoExchangesTable = pgTable(
  "crypto_exchanges",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("crypto_exchanges_name_idx").on(table.name)]
);

export type CryptoExchangeEntity = typeof cryptoExchangesTable.$inferSelect;
export type CryptoExchangeInsertEntity =
  typeof cryptoExchangesTable.$inferInsert;

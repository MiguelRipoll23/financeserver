import {
  bigserial,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cryptoExchangesTable = pgTable(
  "crypto_exchanges",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    taxPercentage: numeric("tax_percentage", {
      precision: 8,
      scale: 6,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("crypto_exchanges_name_unique").on(sql`lower(${table.name})`),
  ]
);

export type CryptoExchangeEntity = typeof cryptoExchangesTable.$inferSelect;
export type CryptoExchangeInsertEntity =
  typeof cryptoExchangesTable.$inferInsert;
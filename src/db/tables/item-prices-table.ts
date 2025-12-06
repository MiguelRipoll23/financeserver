import {
  bigserial,
  bigint,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { itemsTable } from "./items-table.ts";

export const itemPricesTable = pgTable(
  "item_prices",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itemId: bigint("item_id", { mode: "number" })
      .notNull()
      .references(() => itemsTable.id, { onDelete: "cascade" }),
    priceDate: date("price_date").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("item_prices_item_id_price_date_key").on(
      table.itemId,
      table.priceDate
    ),
    index("item_prices_unit_price_idx").on(table.unitPrice),
    index("item_prices_price_date_idx").on(table.priceDate),
    index("item_prices_item_id_price_date_desc_idx").on(
      table.itemId,
      table.priceDate.desc()
    ),
  ]
);

export type ItemPriceEntity = typeof itemPricesTable.$inferSelect;
export type ItemPriceInsertEntity = typeof itemPricesTable.$inferInsert;

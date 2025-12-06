import {
  bigserial,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const itemsTable = pgTable(
  "items",
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
  (table) => [uniqueIndex("items_name_key").on(table.name)]
);

export type ItemEntity = typeof itemsTable.$inferSelect;
export type ItemInsertEntity = typeof itemsTable.$inferInsert;

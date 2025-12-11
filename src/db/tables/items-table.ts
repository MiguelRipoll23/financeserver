import {
  bigint,
  bigserial,
  index,
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
    parentItemId: bigint("parent_item_id", { mode: "number" }).references(
      () => itemsTable.id,
      { onDelete: "cascade" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("items_name_parent_item_id_key").on(table.name, table.parentItemId),
    index("items_parent_item_id_idx").on(table.parentItemId),
  ]
);

export type ItemEntity = typeof itemsTable.$inferSelect;
export type ItemInsertEntity = typeof itemsTable.$inferInsert;

import {
  bigint,
  bigserial,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const itemsTable = pgTable(
  "items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    parentItemId: bigint("parent_item_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Self-reference FK (no TS circular errors)
    foreignKey({
      name: "items_parent_item_id_items_id_fk",
      columns: [table.parentItemId],
      foreignColumns: [table.id],
    }).onDelete("cascade"),

    // Root-level items: unique name when there is no parent
    uniqueIndex("items_root_name_key")
      .on(table.name)
      .where(sql`${table.parentItemId} IS NULL`),

    // Subitems: unique per (parent, name) when there is a parent
    uniqueIndex("items_name_parent_item_id_key")
      .on(table.name, table.parentItemId)
      .where(sql`${table.parentItemId} IS NOT NULL`),

    index("items_parent_item_id_idx").on(table.parentItemId),
  ],
);

export type ItemEntity = typeof itemsTable.$inferSelect;
export type ItemInsertEntity = typeof itemsTable.$inferInsert;

import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const billCategoriesTable = pgTable(
  "bill_category",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    favoritedAt: timestamp("favorited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bill_category_normalized_name_key").on(table.normalizedName),
    index("bill_category_favorited_idx").on(table.name).where(
      sql`${table.favoritedAt} IS NOT NULL`
    ),
  ]
);

export type BillCategoryEntity = typeof billCategoriesTable.$inferSelect;
export type BillCategoryInsertEntity = typeof billCategoriesTable.$inferInsert;

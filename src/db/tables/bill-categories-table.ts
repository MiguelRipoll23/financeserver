import {
  bigserial,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
  ]
);

export type BillCategoryEntity = typeof billCategoriesTable.$inferSelect;
export type BillCategoryInsertEntity = typeof billCategoriesTable.$inferInsert;

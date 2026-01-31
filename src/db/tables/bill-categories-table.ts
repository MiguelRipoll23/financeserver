import {
  bigserial,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  varchar,
} from "drizzle-orm/pg-core";

export const billCategoriesTable = pgTable(
  "bill_category",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    hexColor: varchar("hex_color", { length: 7 }),
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
    // Sorting index for name ASC
    index("bill_category_name_idx").on(table.name.asc()),
    // Partial/favorited index (if needed in the future)
    // index("idx_bill_categories_favorited").on(table.name.asc()),
    //   .where(sql`${table.favoritedAt} IS NOT NULL`),
  ]
);

export type BillCategoryEntity = typeof billCategoriesTable.$inferSelect;
export type BillCategoryInsertEntity = typeof billCategoriesTable.$inferInsert;

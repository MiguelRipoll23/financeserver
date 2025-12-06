import {
  bigint,
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { billEmailsTable } from "./bill-emails-table.ts";
import { billCategoriesTable } from "./bill-categories-table.ts";

export const billsTable = pgTable(
  "bills",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    billDate: date("bill_date").notNull(),
    categoryId: bigint("category_id", { mode: "number" })
      .notNull()
      .references(() => billCategoriesTable.id, { onDelete: "restrict" }),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    emailId: bigint("email_id", { mode: "number" }).references(
      () => billEmailsTable.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bills_bill_date_unique").on(table.billDate),
    index("bills_category_id_idx").on(table.categoryId),
    index("bills_total_amount_idx").on(table.totalAmount),
    index("bills_bill_date_category_id_idx").on(
      table.billDate,
      table.categoryId
    ),
  ]
);

export type BillEntity = typeof billsTable.$inferSelect;
export type BillInsertEntity = typeof billsTable.$inferInsert;

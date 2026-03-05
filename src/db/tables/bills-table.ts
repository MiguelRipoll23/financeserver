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
import { billCategoriesTable } from "./bill-categories-table.ts";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const BILL_RECURRENCES = ["weekly", "bi-weekly", "monthly", "quarterly", "yearly"] as const;
export type BillRecurrence = typeof BILL_RECURRENCES[number];

export const billsTable = pgTable(
  "bills",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    billDate: date("bill_date").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    categoryId: bigint("category_id", { mode: "number" })
      .notNull()
      .references(() => billCategoriesTable.id, { onDelete: "restrict" }),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    recurrence: varchar("recurrence", { length: 16 }),
    bankAccountId: bigint("bank_account_id", { mode: "number" }).references(
      () => bankAccountsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bills_bill_date_category_unique").on(
      table.billDate,
      table.categoryId,
    ),
    index("bills_category_id_idx").on(table.categoryId),
    index("bills_total_amount_idx").on(table.totalAmount),
    // Composite index for category/date queries
    index("idx_bills_date_category").on(
      table.billDate.desc(),
      table.categoryId,
    ),
  ],
);

export type BillEntity = typeof billsTable.$inferSelect;
export type BillInsertEntity = typeof billsTable.$inferInsert;

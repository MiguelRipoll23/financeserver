import {
  bigserial,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { index } from "drizzle-orm/pg-core";

export const salaryChangesTable = pgTable(
  "salary_changes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    recurrence: text("recurrence").notNull(),
    netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code").notNull(),
    date: date("date", { mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Sorting index for descending queries
    index("idx_salary_changes_created").on(table.createdAt.desc()),
  ],
);

export type SalaryChangeEntity = typeof salaryChangesTable.$inferSelect;
export type SalaryChangeInsertEntity = typeof salaryChangesTable.$inferInsert;

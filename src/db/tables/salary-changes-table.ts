import {
  bigserial,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const salaryChangesTable = pgTable("salary_change", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  description: text("description").notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SalaryChangeEntity = typeof salaryChangesTable.$inferSelect;
export type SalaryChangeInsertEntity = typeof salaryChangesTable.$inferInsert;

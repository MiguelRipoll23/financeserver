import {
  bigserial,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users-table.ts";

export const salaryChangesTable = pgTable("salary_change", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  netAmount: integer("net_amount").notNull(),
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

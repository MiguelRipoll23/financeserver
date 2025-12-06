import { bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const billEmailsTable = pgTable("bill_email", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BillEmailEntity = typeof billEmailsTable.$inferSelect;
export type BillEmailInsertEntity = typeof billEmailsTable.$inferInsert;

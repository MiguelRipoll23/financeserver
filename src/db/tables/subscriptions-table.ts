import {
  bigint,
  bigserial,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const recurrenceEnum = pgEnum("recurrence", [
  "weekly",
  "bi-weekly",
  "monthly",
  "yearly",
]);

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
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
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    // Index for fast lookup/filtering by is_active (if needed)
    index("idx_subscriptions_is_active").on(table.isActive),
  ],
);

export type SubscriptionEntity = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsertEntity = typeof subscriptionsTable.$inferInsert;

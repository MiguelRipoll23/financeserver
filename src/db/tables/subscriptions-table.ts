import {
  bigserial,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subscriptions_is_active_idx").on(table.isActive),
  ]
);

export type SubscriptionEntity = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsertEntity = typeof subscriptionsTable.$inferInsert;

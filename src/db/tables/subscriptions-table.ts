import {
  bigserial,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const recurrenceEnum = pgEnum("recurrence", [
  "weekly",
  "bi-weekly",
  "monthly",
  "yearly",
]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SubscriptionEntity = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsertEntity = typeof subscriptionsTable.$inferInsert;

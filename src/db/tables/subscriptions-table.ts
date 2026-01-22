import {
  bigserial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  index,
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
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
},
(table) => [
  // Composite index for active subscriptions ordering
  index("idx_subscriptions_active_effective").on(table.isActive, table.effectiveFrom.desc()),
]);

export type SubscriptionEntity = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsertEntity = typeof subscriptionsTable.$inferInsert;

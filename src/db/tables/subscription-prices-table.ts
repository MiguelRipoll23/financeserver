import {
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  bigint,
} from "drizzle-orm/pg-core";
import { subscriptionsTable } from "./subscriptions-table.ts";
import { recurrenceEnum } from "./subscriptions-table.ts";

export const subscriptionPricesTable = pgTable(
  "subscription_prices",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .notNull()
      .references(() => subscriptionsTable.id, { onDelete: "cascade" }),
    recurrence: recurrenceEnum("recurrence").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveUntil: date("effective_until"),
    plan: text("plan"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subscription_prices_subscription_id_idx").on(table.subscriptionId),
    index("subscription_prices_recurrence_idx").on(table.recurrence),
    index("subscription_prices_amount_idx").on(table.amount),
    index("subscription_prices_currency_code_idx").on(table.currencyCode),
    index("subscription_prices_effective_from_idx").on(table.effectiveFrom),
    index("subscription_prices_effective_until_idx").on(table.effectiveUntil),
    index("subscription_prices_subscription_id_effective_from_desc_idx").on(
      table.subscriptionId,
      table.effectiveFrom.desc()
    ),
    index("subscription_prices_effective_dates_idx").on(
      table.effectiveFrom,
      table.effectiveUntil
    ),
  ]
);

export type SubscriptionPriceEntity =
  typeof subscriptionPricesTable.$inferSelect;
export type SubscriptionPriceInsertEntity =
  typeof subscriptionPricesTable.$inferInsert;

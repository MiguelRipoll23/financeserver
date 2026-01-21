import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Note: The label column does not have a uniqueness constraint to allow users
// to create multiple cash sources with the same label (e.g., multiple "Wallet"
// entries for different currencies or purposes), similar to bank accounts.
export const cashTable = pgTable(
  "cash",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("cash_label_idx").on(table.label)],
);

export type CashEntity = typeof cashTable.$inferSelect;
export type CashInsertEntity = typeof cashTable.$inferInsert;

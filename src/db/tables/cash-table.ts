import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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
  (table) => [index("cash_label_idx").on(table.label)]
);

export type CashEntity = typeof cashTable.$inferSelect;
export type CashInsertEntity = typeof cashTable.$inferInsert;

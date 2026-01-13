import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const bankAccountsTable = pgTable(
  "bank_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("bank_accounts_name_idx").on(table.name)]
);

export type BankAccountEntity = typeof bankAccountsTable.$inferSelect;
export type BankAccountInsertEntity = typeof bankAccountsTable.$inferInsert;

import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const bankAccountBalancesTable = pgTable(
  "bank_account_balances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bankAccountId: bigint("bank_account_id", { mode: "number" })
      .notNull()
      .references(() => bankAccountsTable.id, { onDelete: "cascade" }),
    balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite index for filtered queries (per account)
    index("idx_bank_account_balances_account_created").on(
      table.bankAccountId,
      table.createdAt.desc(),
    ),
    // Index for full table scans (Dashboard load)
    index("idx_bank_account_balances_created").on(table.createdAt.desc()),
  ],
);

export type BankAccountBalanceEntity =
  typeof bankAccountBalancesTable.$inferSelect;
export type BankAccountBalanceInsertEntity =
  typeof bankAccountBalancesTable.$inferInsert;

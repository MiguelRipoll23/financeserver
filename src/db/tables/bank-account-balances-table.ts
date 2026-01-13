import {
  bigint,
  bigserial,
  date,
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
    currencySymbol: varchar("currency_symbol", { length: 3 }).notNull(),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
    interestRateStartDate: date("interest_rate_start_date"),
    interestRateEndDate: date("interest_rate_end_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bank_account_balances_bank_account_id_idx").on(table.bankAccountId),
    index("bank_account_balances_created_at_idx").on(table.createdAt),
  ]
);

export type BankAccountBalanceEntity =
  typeof bankAccountBalancesTable.$inferSelect;
export type BankAccountBalanceInsertEntity =
  typeof bankAccountBalancesTable.$inferInsert;

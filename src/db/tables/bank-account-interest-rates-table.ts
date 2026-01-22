import {
  bigint,
  bigserial,
  check,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const bankAccountInterestRatesTable = pgTable(
  "bank_account_interest_rates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bankAccountId: bigint("bank_account_id", { mode: "number" })
      .notNull()
      .references(() => bankAccountsTable.id, { onDelete: "cascade" }),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
    interestRateStartDate: date("interest_rate_start_date").notNull(),
    interestRateEndDate: date("interest_rate_end_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Composite index for fast dashboard queries
    index("idx_interest_rates_account_created").on(table.bankAccountId, table.createdAt.desc()),
    check(
      "interest_rate_end_date_check",
      sql`${table.interestRateEndDate} IS NULL OR ${table.interestRateEndDate} >= ${table.interestRateStartDate}`
    ),
  ]
);

export type BankAccountInterestRateEntity =
  typeof bankAccountInterestRatesTable.$inferSelect;
export type BankAccountInterestRateInsertEntity =
  typeof bankAccountInterestRatesTable.$inferInsert;

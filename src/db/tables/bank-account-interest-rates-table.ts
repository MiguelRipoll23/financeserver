import {
  bigint,
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
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
    index("bank_account_interest_rates_bank_account_id_idx").on(
      table.bankAccountId
    ),
    index("bank_account_interest_rates_created_at_idx").on(table.createdAt),
  ]
);

export type BankAccountInterestRateEntity =
  typeof bankAccountInterestRatesTable.$inferSelect;
export type BankAccountInterestRateInsertEntity =
  typeof bankAccountInterestRatesTable.$inferInsert;

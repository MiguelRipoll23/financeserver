import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const bankAccountInterestRateCalculationsTable = pgTable(
  "bank_account_interest_rate_calculations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bankAccountId: bigint("bank_account_id", { mode: "number" })
      .notNull()
      .references(() => bankAccountsTable.id, { onDelete: "cascade" }),
    monthlyProfitAfterTax: numeric("monthly_profit_after_tax", {
      precision: 15,
      scale: 2,
    }).notNull(),
    annualProfitAfterTax: numeric("annual_profit_after_tax", {
      precision: 15,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_interest_rate_calcs_account_created").on(
      table.bankAccountId,
      table.createdAt.desc()
    ),
  ]
);

export type BankAccountInterestRateCalculationEntity =
  typeof bankAccountInterestRateCalculationsTable.$inferSelect;
export type BankAccountInterestRateCalculationInsertEntity =
  typeof bankAccountInterestRateCalculationsTable.$inferInsert;

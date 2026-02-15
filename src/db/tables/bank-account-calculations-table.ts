import {
  bigint,
  bigserial,
  index,
  uniqueIndex,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const bankAccountCalculationsTable = pgTable(
  "bank_account_calculations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bankAccountId: bigint("bank_account_id", { mode: "number" })
      .notNull()
      .references(() => bankAccountsTable.id, { onDelete: "cascade" }),
    monthlyProfit: numeric("monthly_profit", {
      precision: 15,
      scale: 2,
    }).notNull(),
    annualProfit: numeric("annual_profit", {
      precision: 15,
      scale: 2,
    }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_bank_account_calculations_account").on(
      table.bankAccountId,
    ),
    index("idx_bank_account_calculations_account_created").on(
      table.bankAccountId,
      table.createdAt.desc()
    ),
  ]
);

export type BankAccountCalculationEntity =
  typeof bankAccountCalculationsTable.$inferSelect;
export type BankAccountCalculationInsertEntity =
  typeof bankAccountCalculationsTable.$inferInsert;

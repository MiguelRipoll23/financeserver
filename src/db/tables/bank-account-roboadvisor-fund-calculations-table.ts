import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { bankAccountRoboadvisors } from "./bank-account-roboadvisors-table.ts";

export const bankAccountRoboadvisorFundCalculationsTable = pgTable(
  "bank_account_roboadvisor_fund_calculations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bankAccountRoboadvisorId: bigint("bank_account_roboadvisor_id", {
      mode: "number",
    })
      .notNull()
      .references(() => bankAccountRoboadvisors.id, { onDelete: "cascade" }),
    currentValueAfterTax: numeric("current_value_after_tax", {
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
    index("idx_roboadvisor_fund_calcs_roboadvisor_created").on(
      table.bankAccountRoboadvisorId,
      table.createdAt.desc()
    ),
  ]
);

export type BankAccountRoboadvisorFundCalculationEntity =
  typeof bankAccountRoboadvisorFundCalculationsTable.$inferSelect;
export type BankAccountRoboadvisorFundCalculationInsertEntity =
  typeof bankAccountRoboadvisorFundCalculationsTable.$inferInsert;

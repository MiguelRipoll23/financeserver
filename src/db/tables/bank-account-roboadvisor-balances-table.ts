import {
  pgTable,
  bigserial,
  decimal,
  timestamp,
  date,
  pgEnum,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";
import { bankAccountRoboadvisors } from "./bank-account-roboadvisors-table.ts";

export const balanceTypeEnum = pgEnum("balance_type", [
  "deposit",
  "withdrawal",
  "adjustment",
]);

export const bankAccountRoboadvisorBalances = pgTable(
  "bank_account_roboadvisor_balances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    bankAccountRoboadvisorId: bigint("bank_account_roboadvisor_id", {
      mode: "number",
    })
      .references(() => bankAccountRoboadvisors.id, { onDelete: "cascade" })
      .notNull(),

    date: date("date").notNull(),

    type: balanceTypeEnum("type").notNull(),

    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),

    currencyCode: varchar("currency_code", { length: 3 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

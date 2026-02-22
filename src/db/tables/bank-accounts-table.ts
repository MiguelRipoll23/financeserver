import {
  bigserial,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "checking",
  "savings",
  "credit_card",
  "investment",
  "loan",
  "deposit",
  "other",
]);

export const bankAccountsTable = pgTable(
  "bank_accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    type: bankAccountTypeEnum("type").notNull().default("checking"),
    taxPercentage: numeric("tax_percentage", { precision: 8, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("bank_accounts_name_idx").on(table.name)],
);

export type BankAccountEntity = typeof bankAccountsTable.$inferSelect;
export type BankAccountInsertEntity = typeof bankAccountsTable.$inferInsert;

import {
  pgTable,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  bigint,
  bigserial,
} from "drizzle-orm/pg-core";
import { bankAccountsTable } from "./bank-accounts-table.ts";

export const feeFrequencyEnum = pgEnum("fee_frequency", [
  "monthly",
  "quarterly",
  "yearly",
]);

export const bankAccountRoboadvisors = pgTable("bank_account_roboadvisors", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  bankAccountId: bigint("bank_account_id", { mode: "number" })
    .notNull()
    .references(() => bankAccountsTable.id, { onDelete: "cascade" }),

  riskLevel: integer("risk_level"),

  // Annual fees (VAT included)
  managementFeePercentage: decimal("management_fee_percentage", {
    precision: 6,
    scale: 5,
  }).notNull(), // 0.0015 = 0.15%

  custodyFeePercentage: decimal("custody_fee_percentage", {
    precision: 6,
    scale: 5,
  }).notNull(), // 0.0015 = 0.15%

  fundTerPercentage: decimal("fund_ter_percentage", {
    precision: 6,
    scale: 5,
  }).notNull(), // 0.0010 = 0.10%

  totalFeePercentage: decimal("total_fee_percentage", {
    precision: 6,
    scale: 5,
  }).notNull(), // 0.0040 = 0.40%

  managementFeeFrequency: feeFrequencyEnum(
    "management_fee_frequency",
  ).notNull(),

  custodyFeeFrequency: feeFrequencyEnum("custody_fee_frequency").notNull(),

  terPricedInNav: boolean("ter_priced_in_nav").notNull().default(true),

  capitalGainsTaxPercentage: decimal("capital_gains_tax_percentage", {
    precision: 5,
    scale: 2,
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

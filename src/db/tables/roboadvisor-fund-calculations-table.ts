import {
  bigint,
  bigserial,
  index,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { roboadvisors } from "./roboadvisors-table.ts";

export const roboadvisorFundCalculationsTable = pgTable(
  "roboadvisor_fund_calculations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    roboadvisorId: bigint("roboadvisor_id", {
      mode: "number",
    })
      .notNull()
      .references(() => roboadvisors.id, { onDelete: "cascade" }),
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
      table.roboadvisorId,
      table.createdAt.desc()
    ),
  ]
);

export type RoboadvisorFundCalculationEntity =
  typeof roboadvisorFundCalculationsTable.$inferSelect;
export type RoboadvisorFundCalculationInsertEntity =
  typeof roboadvisorFundCalculationsTable.$inferInsert;

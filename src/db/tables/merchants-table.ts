import {
  bigserial,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const merchantsTable = pgTable(
  "merchants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("merchants_name_unique").on(sql`lower(${table.name})`),
  ],
);

export type MerchantEntity = typeof merchantsTable.$inferSelect;
export type MerchantInsertEntity = typeof merchantsTable.$inferInsert;

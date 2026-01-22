import {
  bigint,
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { merchantsTable } from "./merchants-table.ts";

export const receiptsTable = pgTable(
  "receipts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    receiptDate: date("receipt_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .default("USD"),
    merchantId: bigint("merchant_id", { mode: "number" }).references(
      () => merchantsTable.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("receipts_receipt_date_idx").on(table.receiptDate),
    index("receipts_total_amount_idx").on(table.totalAmount),
    index("receipts_merchant_id_idx").on(table.merchantId),
    index("receipts_receipt_date_desc_idx").on(sql`${table.receiptDate} DESC`),

  ]
);

export type ReceiptEntity = typeof receiptsTable.$inferSelect;
export type ReceiptInsertEntity = typeof receiptsTable.$inferInsert;

import {
  bigserial,
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { receiptsTable } from "./receipts-table.ts";
import { itemsTable } from "./items-table.ts";

export const receiptItemsTable = pgTable(
  "receipt_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    receiptId: bigint("receipt_id", { mode: "number" })
      .notNull()
      .references(() => receiptsTable.id, { onDelete: "cascade" }),
    itemId: bigint("item_id", { mode: "number" })
      .notNull()
      .references(() => itemsTable.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("receipt_items_receipt_id_idx").on(table.receiptId),
    index("receipt_items_item_id_idx").on(table.itemId),
  ]
);

export type ReceiptItemEntity = typeof receiptItemsTable.$inferSelect;
export type ReceiptItemInsertEntity = typeof receiptItemsTable.$inferInsert;

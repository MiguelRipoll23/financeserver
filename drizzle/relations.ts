import { relations } from "drizzle-orm/relations";
import {
  receipts,
  receiptItems,
  items,
  billCategory,
  bills,
  billEmail,
  itemPrices,
} from "./schema.ts";

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptItems.receiptId],
    references: [receipts.id],
  }),
  item: one(items, {
    fields: [receiptItems.itemId],
    references: [items.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ many }) => ({
  receiptItems: many(receiptItems),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  receiptItems: many(receiptItems),
  itemPrices: many(itemPrices),
  parentItem: one(items, {
    fields: [items.parentItemId],
    references: [items.id],
    relationName: "subItems",
  }),
  subItems: many(items, {
    relationName: "subItems",
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  billCategory: one(billCategory, {
    fields: [bills.categoryId],
    references: [billCategory.id],
  }),
  billEmail: one(billEmail, {
    fields: [bills.emailId],
    references: [billEmail.id],
  }),
}));

export const billCategoryRelations = relations(billCategory, ({ many }) => ({
  bills: many(bills),
}));

export const billEmailRelations = relations(billEmail, ({ many }) => ({
  bills: many(bills),
}));

export const itemPricesRelations = relations(itemPrices, ({ one }) => ({
  item: one(items, {
    fields: [itemPrices.itemId],
    references: [items.id],
  }),
}));

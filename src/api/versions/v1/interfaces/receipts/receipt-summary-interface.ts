import { ReceiptLineItem } from "./receipt-line-item-interface.ts";

export interface ReceiptSummary {
  id: number;
  date: string;
  totalAmount: string;
  currencyCode: string;
  items: ReceiptLineItem[];
}

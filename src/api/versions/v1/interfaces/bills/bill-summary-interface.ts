import type { BillRecurrence } from "../../../../../db/tables/bills-table.ts";

export interface BillSummary {
  id: number;
  date: string;
  categoryId: number;
  category: string;
  totalAmount: string;
  currencyCode: string;
  senderEmail: string | null;
  favoritedAt: string | null;
  recurrence: BillRecurrence | null;
  updatedAt: string;
}

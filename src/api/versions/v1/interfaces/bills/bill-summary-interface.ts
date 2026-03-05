import type { BillRecurrence } from "../../../../../db/tables/bills-table.ts";

export interface BillSummary {
  id: number;
  name: string;
  date: string;
  categoryId: number;
  category: string;
  totalAmount: string;
  currencyCode: string;
  favoritedAt: string | null;
  recurrence: BillRecurrence | null;
  updatedAt: string;
}

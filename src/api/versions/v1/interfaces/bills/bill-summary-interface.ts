export interface BillSummary {
  id: number;
  date: string;
  categoryId: number;
  category: string;
  totalAmount: string;
  currencyCode: string;
  senderEmail: string | null;
  favoritedAt: string | null;
  updatedAt: string;
}

export interface BillSummary {
  id: number;
  senderEmail: string | null;
  date: string;
  category: string;
  totalAmount: string;
  currencyCode: string;
  updatedAt: string;
}

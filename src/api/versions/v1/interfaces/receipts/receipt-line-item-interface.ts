export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  items?: ReceiptLineItem[];
}

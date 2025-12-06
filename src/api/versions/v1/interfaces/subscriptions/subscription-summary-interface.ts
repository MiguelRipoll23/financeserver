export interface SubscriptionSummary {
  id: number;
  name: string;
  category: string;
  recurrence: string;
  amount: string;
  currencyCode: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  plan: string | null;
  updatedAt: string;
}

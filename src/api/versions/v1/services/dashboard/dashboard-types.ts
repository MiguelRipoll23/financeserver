// ─── Response types for /api/v1/dashboard/* endpoints ────────────────────────

export interface DashboardKpisResponse {
  liquidMoney: number;
  investedMoney: number;
  totalInvestedCost: number;
  monthlyInterestIncome: number;
  totalMonthlyIncome: number;
  monthlyBills: number;
  monthlyReceipts: number;
  monthlySubscriptions: number;
  currencyCode: string;
}

export interface NetWorthPoint {
  date: string;
  value?: number;
  projection?: number;
}

export interface DashboardNetWorthResponse {
  netWorth: NetWorthPoint[];
}

export interface DashboardPortfolioResponse {
  portfolio: { name: string; value: number }[];
}

export interface DashboardMoneyFlowResponse {
  liquidFlow: {
    nodes: { name: string }[];
    links: { source: number; target: number; value: number }[];
  };
  liquidFlowSummary: { gained: number; lost: number; netChange: number };
}

export interface DashboardMonthlyExpensesResponse {
  bills: Record<string, string | number | null>[];
  billCategories: string[];
  billCategoryColors: Record<string, string>;
  favoritedBillCategories: string[];
}

export interface DashboardListsResponse {
  subscriptions: { name: string; total: number }[];
  receipts: { name: string; total: number }[];
  totalSubscriptions: number;
  totalReceipts: number;
}

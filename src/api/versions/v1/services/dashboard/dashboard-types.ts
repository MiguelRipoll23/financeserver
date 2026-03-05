// ─── Response types for /api/v1/dashboard/* endpoints ────────────────────────

export interface DashboardKpisResponse {
  liquidMoney: string;
  investedMoney: string;
  totalInvestedCost: string;
  monthlyInterestIncome: string;
  totalMonthlyIncome: string;
  monthlyBills: string;
  monthlyReceipts: string;
  monthlySubscriptions: string;
  currencyCode: string;
}

export interface NetWorthPoint {
  date: string;
  value?: string;
  projection?: string;
}

export interface DashboardNetWorthResponse {
  netWorth: NetWorthPoint[];
}

export interface DashboardPortfolioResponse {
  portfolio: { name: string; value: string }[];
}

export interface DashboardMoneyFlowResponse {
  liquidFlow: {
    nodes: { name: string }[];
    links: { source: number; target: number; value: string }[];
  };
  liquidFlowSummary: { gained: string; lost: string; netChange: string };
}

export interface DashboardMonthlyExpensesResponse {
  bills: Record<string, string | number | null>[];
  billCategories: string[];
  billCategoryColors: Record<string, string>;
  favoritedBillCategories: string[];
}

export interface DashboardListsResponse {
  subscriptions: { name: string; total: string }[];
  receipts: { name: string; total: string }[];
  totalSubscriptions: string;
  totalReceipts: string;
}

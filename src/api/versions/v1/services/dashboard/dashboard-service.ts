import { inject, injectable } from "@needle-di/core";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { getDashboardKpisData } from "./queries/kpis.ts";
import { getDashboardNetWorthData } from "./queries/net-worth.ts";
import { getDashboardPortfolioData } from "./queries/portfolio.ts";
import { getDashboardMoneyFlowData } from "./queries/money-flow.ts";
import { getDashboardMonthlyExpensesData } from "./queries/monthly-expenses.ts";
import { getDashboardListsData } from "./queries/lists.ts";

export type {
  DashboardKpisResponse,
  DashboardNetWorthResponse,
  DashboardPortfolioResponse,
  DashboardMoneyFlowResponse,
  DashboardMonthlyExpensesResponse,
  DashboardListsResponse,
} from "./dashboard-types.ts";

@injectable()
export class DashboardService {
  constructor(private databaseService = inject(DatabaseService)) {}

  getDashboardKpis() {
    return getDashboardKpisData(this.databaseService.get());
  }

  getDashboardNetWorth() {
    return getDashboardNetWorthData(this.databaseService.get());
  }

  getDashboardPortfolio() {
    return getDashboardPortfolioData(this.databaseService.get());
  }

  getDashboardMoneyFlow() {
    return getDashboardMoneyFlowData(this.databaseService.get());
  }

  getDashboardMonthlyExpenses() {
    return getDashboardMonthlyExpensesData(this.databaseService.get());
  }

  getDashboardLists() {
    return getDashboardListsData(this.databaseService.get());
  }
}
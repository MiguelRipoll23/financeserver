import { inject, injectable } from "@needle-di/core";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import { DashboardService } from "../../services/dashboard/dashboard-service.ts";
import { HonoVariables } from "../../../../../core/types/hono/hono-variables-type.ts";
import { ServerResponse } from "../../models/server-response.ts";

// ─── response schemas (zod) ───────────────────────────────────────────────────

const DashboardKpisResponseSchema = z.object({
  liquidMoney: z.number(),
  investedMoney: z.number(),
  totalInvestedCost: z.number(),
  monthlyInterestIncome: z.number(),
  totalMonthlyIncome: z.number(),
  monthlyBills: z.number(),
  monthlyReceipts: z.number(),
  monthlySubscriptions: z.number(),
  currencyCode: z.string(),
});

const NetWorthPointSchema = z.object({
  date: z.string(),
  value: z.number().optional(),
  projection: z.number().optional(),
});

const DashboardNetWorthResponseSchema = z.object({
  netWorth: z.array(NetWorthPointSchema),
});

const PortfolioItemSchema = z.object({ name: z.string(), value: z.number() });

const DashboardPortfolioResponseSchema = z.object({
  portfolio: z.array(PortfolioItemSchema),
});

const LiquidFlowLinkSchema = z.object({
  source: z.number(),
  target: z.number(),
  value: z.number(),
});
const LiquidFlowNodeSchema = z.object({ name: z.string() });

const DashboardMoneyFlowResponseSchema = z.object({
  liquidFlow: z.object({
    nodes: z.array(LiquidFlowNodeSchema),
    links: z.array(LiquidFlowLinkSchema),
  }),
  liquidFlowSummary: z.object({
    gained: z.number(),
    lost: z.number(),
    netChange: z.number(),
  }),
});

const DashboardMonthlyExpensesResponseSchema = z.object({
  bills: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  billCategories: z.array(z.string()),
  billCategoryColors: z.record(z.string()),
  favoritedBillCategories: z.array(z.string()),
});

const ListItemSchema = z.object({ name: z.string(), total: z.number() });
const DashboardListsResponseSchema = z.object({
  subscriptions: z.array(ListItemSchema),
  receipts: z.array(ListItemSchema),
  totalSubscriptions: z.number(),
  totalReceipts: z.number(),
});

// ─── router ───────────────────────────────────────────────────────────────────

@injectable()
export class AuthenticatedDashboardRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private dashboardService = inject(DashboardService)) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.registerKpisRoute();
    this.registerNetWorthRoute();
    this.registerPortfolioRoute();
    this.registerMoneyFlowRoute();
    this.registerMonthlyExpensesRoute();
    this.registerListsRoute();
  }

  // GET /dashboard/kpis
  private registerKpisRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/kpis",
        summary: "Dashboard KPIs",
        description:
          "Returns pre-computed KPI values for Net Worth, Liquid Assets, Interest Rate, Investments, Total Income, and monthly expense totals.",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Dashboard KPIs",
            content: {
              "application/json": { schema: DashboardKpisResponseSchema },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardKpis();
        return context.json(result, 200);
      },
    );
  }

  // GET /dashboard/net-worth
  private registerNetWorthRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/net-worth",
        summary: "Net worth history and projection",
        description:
          "Returns monthly net worth history data points and a 6-month forward projection.",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Net worth data",
            content: {
              "application/json": { schema: DashboardNetWorthResponseSchema },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardNetWorth();
        return context.json(result, 200);
      },
    );
  }

  // GET /dashboard/portfolio
  private registerPortfolioRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/portfolio",
        summary: "Portfolio allocation",
        description: "Returns portfolio allocation breakdown (liquid vs invested).",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Portfolio data",
            content: {
              "application/json": { schema: DashboardPortfolioResponseSchema },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardPortfolio();
        return context.json(result, 200);
      },
    );
  }

  // GET /dashboard/money-flow
  private registerMoneyFlowRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/money-flow",
        summary: "Monthly money flow (Sankey)",
        description:
          "Returns monthly income vs expenses as a Sankey diagram (nodes/links) plus a summary of total gained, lost, and net change.",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Money flow data",
            content: {
              "application/json": { schema: DashboardMoneyFlowResponseSchema },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardMoneyFlow();
        return context.json(result, 200);
      },
    );
  }

  // GET /dashboard/monthly-expenses
  private registerMonthlyExpensesRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/monthly-expenses",
        summary: "Monthly bills history chart data",
        description:
          "Returns bills grouped by month and category, with trend lines, category colors, and favorited categories.",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Monthly expenses data",
            content: {
              "application/json": {
                schema: DashboardMonthlyExpensesResponseSchema,
              },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardMonthlyExpenses();
        return context.json(result, 200);
      },
    );
  }

  // GET /dashboard/lists
  private registerListsRoute(): void {
    this.app.openapi(
      createRoute({
        method: "get",
        path: "/lists",
        summary: "Monthly subscriptions and top merchants lists",
        description:
          "Returns the monthly subscriptions list (normalized to monthly amount) and top merchants for the current month.",
        tags: ["Dashboard"],
        responses: {
          200: {
            description: "Lists data",
            content: {
              "application/json": { schema: DashboardListsResponseSchema },
            },
          },
          ...ServerResponse.Unauthorized,
        },
      }),
      async (context: Context<{ Variables: HonoVariables }>) => {
        const result = await this.dashboardService.getDashboardLists();
        return context.json(result, 200);
      },
    );
  }
}

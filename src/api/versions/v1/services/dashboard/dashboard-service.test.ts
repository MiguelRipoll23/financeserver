/**
 * Unit tests for DashboardService
 *
 * These tests mock the DatabaseService and verify that each endpoint method
 * correctly computes and returns the expected dashboard data.
 *
 * Run with: deno test src/api/versions/v1/services/dashboard/dashboard-service.test.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1";
import { DashboardService } from "./dashboard-service.ts";

// ─── minimal mock for DatabaseService ────────────────────────────────────────

function makeDbMock(overrides: Record<string, unknown> = {}) {
  const defaults = {
    // DISTINCT ON queries via db.execute()
    latestBankBalances: { rows: [] },
    latestCashBalances: { rows: [] },
    latestCryptoBalances: { rows: [] },
    latestRoboadvisorCalcs: { rows: [] },
    // Typed select() results
    bankCalcs: [],
    allCryptoCalcs: [],
    roboadvisorCalcs: [],
    roboadvisorBals: [],
    monthBills: [],
    monthReceipts: [],
    activeSubscriptions: [],
    latestSalary: [],
    allBills: [],
    allCategories: [],
    bankBalances: [],
    cashBalances: [],
    cryptoBalances: [],
  };

  const data = { ...defaults, ...overrides };

  // Track which raw SQL templates are being called
  const executeCallCount = { n: 0 };

  const executeResponses = [
    data.latestBankBalances,
    data.latestCashBalances,
    data.latestCryptoBalances,
    data.latestRoboadvisorCalcs,
  ];

  const db = {
    execute: (_q: unknown) => {
      const resp = executeResponses[executeCallCount.n] ??
        { rows: [] };
      executeCallCount.n++;
      return Promise.resolve(resp);
    },

    // Chainable builder that resolves with preconfigured data
    _selectIdx: { n: 0 },
    _selectData: [
      data.bankCalcs,
      data.allCryptoCalcs,
      data.roboadvisorCalcs,
      data.roboadvisorBals,
      data.monthBills,
      data.monthReceipts,
      data.activeSubscriptions,
      data.latestSalary,
    ],

    select: function (_fields: unknown) {
      return this._makeChain();
    },
    _makeChain: function () {
      const self = this;
      let resolved: unknown[] = [];

      const chain: Record<string, unknown> = {
        from: (_t: unknown) => chain,
        innerJoin: (_t: unknown, _on: unknown) => chain,
        leftJoin: (_t: unknown, _on: unknown) => chain,
        where: (_c: unknown) => chain,
        orderBy: (..._args: unknown[]) => chain,
        limit: (_n: number) => chain,
        then: (cb: (v: unknown) => unknown) => {
          if (!resolved.length) {
            resolved = (self._selectData[self._selectIdx.n] as unknown[]) ?? [];
            self._selectIdx.n++;
          }
          return Promise.resolve(cb(resolved));
        },
      };
      // Make it thenable at the chain level too
      (chain as { [Symbol.toPrimitive]?: unknown })[Symbol.toPrimitive] =
        undefined;
      Object.defineProperty(chain, Symbol.iterator, {
        get: () => () => [][Symbol.iterator](),
      });

      // Allow await on the chain itself
      (chain as { then: unknown }).then = (
        cb: (v: unknown[]) => unknown,
        _rej?: unknown,
      ) => {
        if (!resolved.length) {
          resolved = (self._selectData[self._selectIdx.n] as unknown[]) ?? [];
          self._selectIdx.n++;
        }
        return Promise.resolve(cb(resolved));
      };

      return chain;
    },
  };

  const databaseService = {
    get: () => db,
  };

  return databaseService as unknown as ConstructorParameters<
    typeof DashboardService
  >[0];
}

// ─── tests ────────────────────────────────────────────────────────────────────

Deno.test("getDashboardKpis - returns zeros when no data", async () => {
  const service = new DashboardService(makeDbMock());
  const result = await service.getDashboardKpis();

  assertEquals(result.liquidMoney, 0);
  assertEquals(result.investedMoney, 0);
  assertEquals(result.totalInvestedCost, 0);
  assertEquals(result.monthlyInterestIncome, 0);
  assertEquals(result.totalMonthlyIncome, 0);
  assertEquals(result.monthlyBills, 0);
  assertEquals(result.monthlyReceipts, 0);
  assertEquals(result.monthlySubscriptions, 0);
  assertEquals(result.currencyCode, "EUR");
});

Deno.test("getDashboardKpis - sums bank balances correctly", async () => {
  const service = new DashboardService(
    makeDbMock({
      latestBankBalances: {
        rows: [
          { bank_account_id: 1, balance: "1000.00", currency_code: "EUR" },
          { bank_account_id: 2, balance: "500.50", currency_code: "EUR" },
        ],
      },
    }),
  );
  const result = await service.getDashboardKpis();
  assertEquals(result.liquidMoney, 1500.5);
  assertEquals(result.currencyCode, "EUR");
});

Deno.test("getDashboardKpis - computes monthly subscriptions for different recurrences", async () => {
  const service = new DashboardService(
    makeDbMock({
      activeSubscriptions: [
        { name: "Netflix", plan: null, amount: "10.00", recurrence: "monthly" },
        { name: "Gym", plan: null, amount: "10.00", recurrence: "weekly" },
        { name: "Domain", plan: null, amount: "12.00", recurrence: "yearly" },
      ],
    }),
  );
  const result = await service.getDashboardKpis();
  // monthly: 10 + weekly: 10*4.33 + yearly: 12/12 = 10 + 43.3 + 1 = 54.3
  const expected = 10 + 10 * 4.33 + 12 / 12;
  assertEquals(Math.round(result.monthlySubscriptions * 100), Math.round(expected * 100));
});

Deno.test("getDashboardNetWorth - returns empty array when no data", async () => {
  const service = new DashboardService(makeDbMock());
  const result = await service.getDashboardNetWorth();
  assertExists(result.netWorth);
  assertEquals(result.netWorth.length, 0);
});

Deno.test("getDashboardNetWorth - builds history and adds 6-month projection", async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);

  const service = new DashboardService(
    makeDbMock({
      bankBalances: [
        {
          bankAccountId: 1,
          balance: "10000.00",
          createdAt: lastMonth,
        },
        {
          bankAccountId: 1,
          balance: "10500.00",
          createdAt: thisMonth,
        },
      ],
    }),
  );
  const result = await service.getDashboardNetWorth();

  // Should have at least 2 historical months + 6 projection months
  assertExists(result.netWorth);
  // Last historical point + 6 projection = 7 extra, but we might have 2 history points
  // Total = 2 history + 6 projection - 1 (overlap) = 7 minimum
  assertEquals(result.netWorth.length >= 7, true);

  // Last 6 entries should be projections only
  const projections = result.netWorth.filter((p) => p.projection !== undefined);
  assertEquals(projections.length >= 6, true);
});

Deno.test("getDashboardPortfolio - returns portfolio with liquid and invested", async () => {
  const service = new DashboardService(
    makeDbMock({
      latestBankBalances: {
        rows: [{ bank_account_id: 1, balance: "5000.00", currency_code: "EUR" }],
      },
      allCryptoCalcs: [{ currentValue: "2000.00" }],
    }),
  );
  const result = await service.getDashboardPortfolio();

  assertExists(result.portfolio);
  assertEquals(result.portfolio.length, 2);
  const liquid = result.portfolio.find((p) => p.name === "Liquid");
  const invested = result.portfolio.find((p) => p.name === "Invested");
  assertExists(liquid);
  assertExists(invested);
  assertEquals(liquid!.value, 5000);
  assertEquals(invested!.value, 2000);
});

Deno.test("getDashboardPortfolio - liquidFlow nodes are always 6", async () => {
  const service = new DashboardService(makeDbMock());
  const result = await service.getDashboardPortfolio();

  assertEquals(result.liquidFlow.nodes.length, 6);
  assertExists(result.liquidFlowSummary);
});

Deno.test("getDashboardMonthlyExpenses - returns empty bills when no data", async () => {
  const service = new DashboardService(makeDbMock());
  const result = await service.getDashboardMonthlyExpenses();

  assertExists(result.bills);
  assertEquals(result.bills.length, 0);
  assertEquals(result.billCategories.length, 0);
  assertExists(result.billCategoryColors);
  assertExists(result.favoritedBillCategories);
});

Deno.test("getDashboardMonthlyExpenses - groups bills by month and category", async () => {
  const service = new DashboardService(
    makeDbMock({
      allBills: [
        { billDate: "2025-01-15", totalAmount: "100.00", categoryName: "Electricity" },
        { billDate: "2025-01-20", totalAmount: "50.00", categoryName: "Electricity" },
        { billDate: "2025-02-10", totalAmount: "120.00", categoryName: "Water" },
      ],
    }),
  );
  const result = await service.getDashboardMonthlyExpenses();

  assertEquals(result.bills.length, 2); // 2 months
  const jan = result.bills.find((b) => b.date === "2025-01");
  assertExists(jan);
  assertEquals(jan!["Electricity"], 150); // 100 + 50
  assertExists(result.billCategories.includes("Electricity"), true);
});

Deno.test("getDashboardLists - returns empty lists when no data", async () => {
  const service = new DashboardService(makeDbMock());
  const result = await service.getDashboardLists();

  assertExists(result.subscriptions);
  assertExists(result.receipts);
  assertEquals(result.subscriptions.length, 0);
  assertEquals(result.receipts.length, 0);
  assertEquals(result.totalSubscriptions, 0);
  assertEquals(result.totalReceipts, 0);
});

Deno.test("getDashboardLists - sorts subscriptions by total descending", async () => {
  const service = new DashboardService(
    makeDbMock({
      activeSubscriptions: [
        { name: "Cheap", plan: null, amount: "5.00", recurrence: "monthly" },
        { name: "Expensive", plan: null, amount: "50.00", recurrence: "monthly" },
        { name: "Mid", plan: null, amount: "20.00", recurrence: "monthly" },
      ],
    }),
  );
  const result = await service.getDashboardLists();

  assertEquals(result.subscriptions[0].name, "Expensive");
  assertEquals(result.subscriptions[1].name, "Mid");
  assertEquals(result.subscriptions[2].name, "Cheap");
  assertEquals(result.totalSubscriptions, 75);
});

Deno.test("getDashboardLists - aggregates receipts by merchant and sorts descending", async () => {
  const service = new DashboardService(
    makeDbMock({
      currentMonthReceipts: [
        { merchantName: "Lidl", totalAmount: "30.00" },
        { merchantName: "Amazon", totalAmount: "120.00" },
        { merchantName: "Lidl", totalAmount: "25.00" },
      ],
    }),
  );
  const result = await service.getDashboardLists();

  assertEquals(result.receipts[0].name, "Amazon");
  assertEquals(result.receipts[0].total, 120);
  assertEquals(result.receipts[1].name, "Lidl");
  assertEquals(result.receipts[1].total, 55);
  assertEquals(result.totalReceipts, 175);
});

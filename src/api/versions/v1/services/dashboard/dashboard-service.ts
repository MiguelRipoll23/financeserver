import { inject, injectable } from "@needle-di/core";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import {
  bankAccountBalancesTable,
  bankAccountCalculationsTable,
  billCategoriesTable,
  billsTable,
  cashBalancesTable,
  cryptoExchangeBalancesTable,
  cryptoExchangeCalculationsTable,
  merchantsTable,
  receiptsTable,
  roboadvisorBalances,
  roboadvisorFundCalculationsTable,
  roboadvisors,
  salaryChangesTable,
  subscriptionPricesTable,
  subscriptionsTable,
} from "../../../../../db/schema.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

function toMonthlyAmount(amount: number, recurrence: string): number {
  switch (recurrence) {
    case "weekly":
      return amount * 4.33;
    case "bi-weekly":
      return amount * 2.17;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

function normalizeCategory(name: string): string {
  if (!name) return "Uncategorized";
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

// ─── response types ──────────────────────────────────────────────────────────

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

// ─── service ─────────────────────────────────────────────────────────────────

@injectable()
export class DashboardService {
  constructor(private databaseService = inject(DatabaseService)) {}

  // ── KPIs ─────────────────────────────────────────────────────────────────

  async getDashboardKpis(): Promise<DashboardKpisResponse> {
    const db = this.databaseService.get();
    const { start, end } = currentMonthRange();

    const [
      latestBankRows,
      latestCashRows,
      bankCalcs,
      allCryptoCalcs,
      latestCryptoRows,
      roboadvisorCalcs,
      roboadvisorBals,
      monthBills,
      monthReceipts,
      activeSubscriptions,
      latestSalary,
    ] = await Promise.all([
      // Latest balance per bank account
      db.execute(sql`
        SELECT DISTINCT ON (bank_account_id)
          bank_account_id, balance, currency_code
        FROM bank_account_balances
        ORDER BY bank_account_id, created_at DESC
      `),
      // Latest balance per cash
      db.execute(sql`
        SELECT DISTINCT ON (cash_id)
          cash_id, balance, currency_code
        FROM cash_balances
        ORDER BY cash_id, created_at DESC
      `),
      // Bank monthly-profit calculations (unique per account)
      db.select({
        monthlyProfit: bankAccountCalculationsTable.monthlyProfit,
        currencyCode: bankAccountCalculationsTable.currencyCode,
      }).from(bankAccountCalculationsTable),
      // All crypto calculations (unique per exchange+symbol)
      db.select({
        currentValue: cryptoExchangeCalculationsTable.currentValue,
      }).from(cryptoExchangeCalculationsTable),
      // Latest crypto balance per exchange+symbol (for cost basis)
      db.execute(sql`
        SELECT DISTINCT ON (crypto_exchange_id, symbol_code)
          crypto_exchange_id, symbol_code, balance, invested_amount
        FROM crypto_exchange_balances
        ORDER BY crypto_exchange_id, symbol_code, created_at DESC
      `),
      // Roboadvisor current value (unique per roboadvisor)
      db.select({
        currentValue: roboadvisorFundCalculationsTable.currentValue,
      }).from(roboadvisorFundCalculationsTable),
      // All roboadvisor balance events for cost basis
      db.select({
        type: roboadvisorBalances.type,
        amount: roboadvisorBalances.amount,
      }).from(roboadvisorBalances),
      // Current-month bills total
      db.select({ totalAmount: billsTable.totalAmount })
        .from(billsTable)
        .where(and(gte(billsTable.billDate, start), lte(billsTable.billDate, end))),
      // Current-month receipts total
      db.select({ totalAmount: receiptsTable.totalAmount })
        .from(receiptsTable)
        .where(
          and(gte(receiptsTable.receiptDate, start), lte(receiptsTable.receiptDate, end)),
        ),
      // Active subscription prices
      db.select({
        name: subscriptionsTable.name,
        plan: subscriptionPricesTable.plan,
        amount: subscriptionPricesTable.amount,
        recurrence: subscriptionPricesTable.recurrence,
      })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPricesTable,
          eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId),
        )
        .where(
          and(
            sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
            or(
              isNull(subscriptionPricesTable.effectiveUntil),
              sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`,
            ),
          ),
        ),
      // Latest salary change
      db.select({
        netAmount: salaryChangesTable.netAmount,
        recurrence: salaryChangesTable.recurrence,
      })
        .from(salaryChangesTable)
        .orderBy(desc(salaryChangesTable.date))
        .limit(1),
    ]);

    // ── compute liquid money ─────────────────────────────────────────────────
    let liquidMoney = 0;
    let currencyCode = "EUR";

    for (const row of latestBankRows.rows) {
      const bal = parseFloat(String(row.balance));
      if (!isNaN(bal)) liquidMoney += bal;
      if (row.currency_code) currencyCode = row.currency_code as string;
    }

    for (const row of latestCashRows.rows) {
      const bal = parseFloat(String(row.balance));
      if (!isNaN(bal)) liquidMoney += bal;
      if (row.currency_code) currencyCode = row.currency_code as string;
    }

    // ── compute monthly interest ─────────────────────────────────────────────
    let monthlyInterestIncome = 0;
    for (const calc of bankCalcs) {
      const profit = parseFloat(String(calc.monthlyProfit));
      if (!isNaN(profit)) monthlyInterestIncome += profit;
      if (calc.currencyCode) currencyCode = calc.currencyCode;
    }

    // ── compute invested money ───────────────────────────────────────────────
    let totalCryptoValue = 0;
    for (const calc of allCryptoCalcs) {
      const val = parseFloat(String(calc.currentValue));
      if (!isNaN(val)) totalCryptoValue += val;
    }

    let totalCryptoCost = 0;
    for (const row of latestCryptoRows.rows) {
      const invested = row.invested_amount
        ? parseFloat(String(row.invested_amount))
        : 0;
      if (!isNaN(invested)) totalCryptoCost += invested;
    }

    let totalRoboadvisorValue = 0;
    for (const calc of roboadvisorCalcs) {
      const val = parseFloat(String(calc.currentValue));
      if (!isNaN(val)) totalRoboadvisorValue += val;
    }

    let totalRoboadvisorCost = 0;
    for (const bal of roboadvisorBals) {
      const amount = parseFloat(String(bal.amount));
      if (isNaN(amount)) continue;
      if (bal.type === "deposit") totalRoboadvisorCost += amount;
      else if (bal.type === "withdrawal") totalRoboadvisorCost -= amount;
    }

    // ── compute monthly expenses ─────────────────────────────────────────────
    let monthlyBills = 0;
    for (const bill of monthBills) {
      const amount = parseFloat(String(bill.totalAmount));
      if (!isNaN(amount)) monthlyBills += amount;
    }

    let monthlyReceipts = 0;
    for (const receipt of monthReceipts) {
      const amount = parseFloat(String(receipt.totalAmount));
      if (!isNaN(amount)) monthlyReceipts += amount;
    }

    let monthlySubscriptions = 0;
    for (const sub of activeSubscriptions) {
      const amount = parseFloat(String(sub.amount));
      if (isNaN(amount)) continue;
      monthlySubscriptions += toMonthlyAmount(amount, sub.recurrence);
    }

    // ── compute total monthly income ─────────────────────────────────────────
    let monthlySalary = 0;
    if (latestSalary.length > 0) {
      const salary = latestSalary[0];
      const amount = parseFloat(String(salary.netAmount));
      if (!isNaN(amount)) {
        monthlySalary = toMonthlyAmount(amount, salary.recurrence);
      }
    }

    const totalMonthlyIncome = Math.max(monthlySalary, 0) +
      Math.max(monthlyInterestIncome, 0);

    return {
      liquidMoney,
      investedMoney: totalCryptoValue + totalRoboadvisorValue,
      totalInvestedCost: totalCryptoCost + totalRoboadvisorCost,
      monthlyInterestIncome,
      totalMonthlyIncome,
      monthlyBills,
      monthlyReceipts,
      monthlySubscriptions,
      currencyCode,
    };
  }

  // ── Net Worth ─────────────────────────────────────────────────────────────

  async getDashboardNetWorth(): Promise<DashboardNetWorthResponse> {
    const db = this.databaseService.get();

    const [
      bankBalances,
      cashBalances,
      cryptoBalances,
      roboadvisorCalcs,
      bankCalcRows,
      latestSalary,
    ] = await Promise.all([
      db.select({
        bankAccountId: bankAccountBalancesTable.bankAccountId,
        balance: bankAccountBalancesTable.balance,
        createdAt: bankAccountBalancesTable.createdAt,
      }).from(bankAccountBalancesTable)
        .orderBy(bankAccountBalancesTable.createdAt)
        .limit(500),
      db.select({
        cashId: cashBalancesTable.cashId,
        balance: cashBalancesTable.balance,
        createdAt: cashBalancesTable.createdAt,
      }).from(cashBalancesTable)
        .orderBy(cashBalancesTable.createdAt)
        .limit(500),
      db.select({
        cryptoExchangeId: cryptoExchangeBalancesTable.cryptoExchangeId,
        symbolCode: cryptoExchangeBalancesTable.symbolCode,
        balance: cryptoExchangeBalancesTable.balance,
        investedAmount: cryptoExchangeBalancesTable.investedAmount,
        createdAt: cryptoExchangeBalancesTable.createdAt,
      }).from(cryptoExchangeBalancesTable)
        .orderBy(cryptoExchangeBalancesTable.createdAt)
        .limit(500),
      // Latest calculation per roboadvisor (for net worth history point)
      db.execute(sql`
        SELECT DISTINCT ON (roboadvisor_id)
          roboadvisor_id, current_value, created_at
        FROM roboadvisor_fund_calculations
        ORDER BY roboadvisor_id, created_at DESC
      `),
      db.select({ monthlyProfit: bankAccountCalculationsTable.monthlyProfit })
        .from(bankAccountCalculationsTable),
      db.select({
        netAmount: salaryChangesTable.netAmount,
        recurrence: salaryChangesTable.recurrence,
      }).from(salaryChangesTable)
        .orderBy(desc(salaryChangesTable.date))
        .limit(1),
    ]);

    // Build balance events
    type BalanceEvent = { date: string; key: string; value: number };
    const events: BalanceEvent[] = [];

    for (const b of bankBalances) {
      const balance = parseFloat(String(b.balance));
      if (!isNaN(balance)) {
        events.push({
          date: b.createdAt.toISOString().split("T")[0],
          key: `bank-${b.bankAccountId}`,
          value: balance,
        });
      }
    }

    for (const b of cashBalances) {
      const balance = parseFloat(String(b.balance));
      if (!isNaN(balance)) {
        events.push({
          date: b.createdAt.toISOString().split("T")[0],
          key: `cash-${b.cashId}`,
          value: balance,
        });
      }
    }

    for (const b of cryptoBalances) {
      const balance = parseFloat(String(b.balance));
      if (isNaN(balance)) continue;
      const fallbackValue =
        b.symbolCode === "USDT" || b.symbolCode === "USDC" ? balance : 0;
      const invested = b.investedAmount
        ? parseFloat(String(b.investedAmount))
        : fallbackValue;
      events.push({
        date: b.createdAt.toISOString().split("T")[0],
        key: `crypto-${b.cryptoExchangeId}-${b.symbolCode}`,
        value: isNaN(invested) ? fallbackValue : invested,
      });
    }

    for (const row of roboadvisorCalcs.rows) {
      const val = parseFloat(String(row.current_value));
      if (!isNaN(val)) {
        const date = row.created_at instanceof Date
          ? row.created_at.toISOString().split("T")[0]
          : String(row.created_at).split("T")[0];
        events.push({ date, key: `roboadvisor-${row.roboadvisor_id}`, value: val });
      }
    }

    // Sort events by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Build net worth time series
    const curBals: Record<string, number> = {};
    const nwByDate: Record<string, number> = {};
    for (const e of events) {
      curBals[e.key] = e.value;
      nwByDate[e.date] = Object.values(curBals).reduce((s, v) => s + v, 0);
    }

    // Aggregate to monthly (last point per month)
    const monthlyMap: Record<string, { date: string; value: number }> = {};
    for (const [date, value] of Object.entries(nwByDate)) {
      const month = date.substring(0, 7);
      if (!monthlyMap[month] || date > monthlyMap[month].date) {
        monthlyMap[month] = { date, value };
      }
    }

    const history = Object.values(monthlyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Compute projection parameters
    let monthlyInterestIncome = 0;
    for (const c of bankCalcRows) {
      const p = parseFloat(String(c.monthlyProfit));
      if (!isNaN(p)) monthlyInterestIncome += p;
    }

    let monthlySalary = 0;
    if (latestSalary.length > 0) {
      const s = latestSalary[0];
      const amount = parseFloat(String(s.netAmount));
      if (!isNaN(amount)) {
        monthlySalary = toMonthlyAmount(amount, s.recurrence);
      }
    }

    // Build final time series with projection
    const netWorthPoints: NetWorthPoint[] = history.map((h) => ({
      date: h.date,
      value: h.value,
    }));

    if (history.length > 0) {
      const last = history[history.length - 1];
      netWorthPoints[netWorthPoints.length - 1].projection = last.value;

      for (let i = 1; i <= 6; i++) {
        const d = new Date(last.date);
        d.setMonth(d.getMonth() + i);
        netWorthPoints.push({
          date: d.toISOString().split("T")[0],
          projection: last.value + monthlyInterestIncome * i + monthlySalary * i,
        });
      }
    }

    return { netWorth: netWorthPoints };
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────

  async getDashboardPortfolio(): Promise<DashboardPortfolioResponse> {
    const db = this.databaseService.get();

    const [latestBankRows, latestCashRows, allCryptoCalcs, roboadvisorCalcs] =
      await Promise.all([
        db.execute(sql`
          SELECT DISTINCT ON (bank_account_id)
            bank_account_id, balance
          FROM bank_account_balances
          ORDER BY bank_account_id, created_at DESC
        `),
        db.execute(sql`
          SELECT DISTINCT ON (cash_id)
            cash_id, balance
          FROM cash_balances
          ORDER BY cash_id, created_at DESC
        `),
        db.select({ currentValue: cryptoExchangeCalculationsTable.currentValue })
          .from(cryptoExchangeCalculationsTable),
        db.select({ currentValue: roboadvisorFundCalculationsTable.currentValue })
          .from(roboadvisorFundCalculationsTable),
      ]);

    let liquidMoney = 0;
    for (const row of latestBankRows.rows) {
      const b = parseFloat(String(row.balance));
      if (!isNaN(b)) liquidMoney += b;
    }
    for (const row of latestCashRows.rows) {
      const b = parseFloat(String(row.balance));
      if (!isNaN(b)) liquidMoney += b;
    }

    let investedMoney = 0;
    for (const c of allCryptoCalcs) {
      const v = parseFloat(String(c.currentValue));
      if (!isNaN(v)) investedMoney += v;
    }
    for (const c of roboadvisorCalcs) {
      const v = parseFloat(String(c.currentValue));
      if (!isNaN(v)) investedMoney += v;
    }

    return {
      portfolio: [
        { name: "Liquid", value: liquidMoney },
        { name: "Invested", value: investedMoney },
      ],
    };
  }

  // ── Money Flow (Sankey) ───────────────────────────────────────────────────

  async getDashboardMoneyFlow(): Promise<DashboardMoneyFlowResponse> {
    const db = this.databaseService.get();
    const { start, end } = currentMonthRange();

    const [
      bankCalcs,
      monthBills,
      monthReceipts,
      activeSubscriptions,
      latestSalary,
    ] = await Promise.all([
      db.select({ monthlyProfit: bankAccountCalculationsTable.monthlyProfit })
        .from(bankAccountCalculationsTable),
      db.select({ totalAmount: billsTable.totalAmount })
        .from(billsTable)
        .where(and(gte(billsTable.billDate, start), lte(billsTable.billDate, end))),
      db.select({ totalAmount: receiptsTable.totalAmount })
        .from(receiptsTable)
        .where(
          and(gte(receiptsTable.receiptDate, start), lte(receiptsTable.receiptDate, end)),
        ),
      db.select({
        amount: subscriptionPricesTable.amount,
        recurrence: subscriptionPricesTable.recurrence,
      })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPricesTable,
          eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId),
        )
        .where(
          and(
            sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
            or(
              isNull(subscriptionPricesTable.effectiveUntil),
              sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`,
            ),
          ),
        ),
      db.select({
        netAmount: salaryChangesTable.netAmount,
        recurrence: salaryChangesTable.recurrence,
      }).from(salaryChangesTable)
        .orderBy(desc(salaryChangesTable.date))
        .limit(1),
    ]);

    let monthlyInterestIncome = 0;
    for (const c of bankCalcs) {
      const p = parseFloat(String(c.monthlyProfit));
      if (!isNaN(p)) monthlyInterestIncome += p;
    }

    let billsOut = 0;
    for (const b of monthBills) {
      const a = parseFloat(String(b.totalAmount));
      if (!isNaN(a)) billsOut += a;
    }

    let receiptsOut = 0;
    for (const r of monthReceipts) {
      const a = parseFloat(String(r.totalAmount));
      if (!isNaN(a)) receiptsOut += a;
    }

    let subscriptionsOut = 0;
    for (const s of activeSubscriptions) {
      const a = parseFloat(String(s.amount));
      if (!isNaN(a)) subscriptionsOut += toMonthlyAmount(a, s.recurrence);
    }

    let monthlySalary = 0;
    if (latestSalary.length > 0) {
      const s = latestSalary[0];
      const amount = parseFloat(String(s.netAmount));
      if (!isNaN(amount)) {
        monthlySalary = toMonthlyAmount(amount, s.recurrence);
      }
    }

    const totalIn = Math.max(monthlySalary, 0) + Math.max(monthlyInterestIncome, 0);
    const totalOut = Math.max(billsOut, 0) + Math.max(receiptsOut, 0) +
      Math.max(subscriptionsOut, 0);

    const nodeNames = [
      "Salary",
      "Interest",
      "Liquid Money",
      "Bills",
      "Merchants",
      "Subscriptions",
    ] as const;
    const getIdx = (name: (typeof nodeNames)[number]) => nodeNames.indexOf(name);

    const links = [
      { source: getIdx("Salary"), target: getIdx("Liquid Money"), value: Math.max(monthlySalary, 0) },
      { source: getIdx("Interest"), target: getIdx("Liquid Money"), value: Math.max(monthlyInterestIncome, 0) },
      { source: getIdx("Liquid Money"), target: getIdx("Bills"), value: Math.max(billsOut, 0) },
      { source: getIdx("Liquid Money"), target: getIdx("Merchants"), value: Math.max(receiptsOut, 0) },
      { source: getIdx("Liquid Money"), target: getIdx("Subscriptions"), value: Math.max(subscriptionsOut, 0) },
    ].filter((l) => l.value > 0);

    return {
      liquidFlow: {
        nodes: nodeNames.map((name) => ({ name })),
        links,
      },
      liquidFlowSummary: {
        gained: totalIn,
        lost: totalOut,
        netChange: totalIn - totalOut,
      },
    };
  }

  // ── Monthly Expenses (bills history chart) ────────────────────────────────

  async getDashboardMonthlyExpenses(): Promise<DashboardMonthlyExpensesResponse> {
    const db = this.databaseService.get();

    const [allBills, allCategories] = await Promise.all([
      db.select({
        billDate: billsTable.billDate,
        totalAmount: billsTable.totalAmount,
        categoryName: billCategoriesTable.name,
      })
        .from(billsTable)
        .innerJoin(
          billCategoriesTable,
          eq(billCategoriesTable.id, billsTable.categoryId),
        )
        .orderBy(desc(billsTable.billDate))
        .limit(500),
      db.select({
        name: billCategoriesTable.name,
        hexColor: billCategoriesTable.hexColor,
        favoritedAt: billCategoriesTable.favoritedAt,
      }).from(billCategoriesTable),
    ]);

    // Build bills history map: month → {category: totalAmount}
    const billsMap: Record<string, Record<string, string | number | null>> = {};
    const billCategoriesSet = new Set<string>();

    for (const b of allBills) {
      const dateStr = typeof b.billDate === "string"
        ? b.billDate
        : (b.billDate as Date).toISOString().split("T")[0];
      const month = dateStr.substring(0, 7);
      if (!billsMap[month]) billsMap[month] = { date: month };
      const cat = normalizeCategory(b.categoryName);
      billCategoriesSet.add(cat);
      const amount = parseFloat(String(b.totalAmount || "0"));
      billsMap[month][cat] = ((billsMap[month][cat] as number) || 0) +
        (isNaN(amount) ? 0 : amount);
    }

    const sortedCats = Array.from(billCategoriesSet);

    const billHistory = Object.keys(billsMap).sort().map((m) => {
      const p = { ...billsMap[m] };
      let total = 0;
      sortedCats.forEach((c) => {
        if (p[c] === undefined) p[c] = null;
        else total += p[c] as number;
      });
      p["Total"] = total;
      return p;
    });

    // Add trend lines via linear regression per category
    for (const cat of [...sortedCats, "Total"]) {
      const dataPoints = billHistory
        .map((p, i) => ({ x: i, y: p[cat] }))
        .filter((p) => p.y !== null && p.y !== undefined);

      if (dataPoints.length > 1) {
        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (const pt of dataPoints) {
          sumX += pt.x;
          sumY += pt.y as number;
          sumXY += pt.x * (pt.y as number);
          sumX2 += pt.x * pt.x;
        }
        const denom = n * sumX2 - sumX * sumX;
        if (denom !== 0) {
          const slope = (n * sumXY - sumX * sumY) / denom;
          const intercept = (sumY - slope * sumX) / n;
          billHistory.forEach((p, i) => {
            p[`${cat} Trend`] = slope * i + intercept;
          });
        }
      }
    }

    // Build category colors and favorited list
    const DEFAULT_COLORS = [
      "#10b981",
      "#3b82f6",
      "#f87171",
      "#fbbf24",
      "#a78bfa",
      "#f472b6",
      "#2dd4bf",
    ];
    const categoryColors: Record<string, string> = {};
    const usedColors = new Set<string>();
    const favoritedBillCategories: string[] = [];

    for (const apiCat of allCategories) {
      if (!apiCat.name) continue;
      const normalized = normalizeCategory(apiCat.name);
      if (apiCat.hexColor) {
        categoryColors[normalized] = apiCat.hexColor;
        usedColors.add(apiCat.hexColor.toLowerCase());
      }
      if (apiCat.favoritedAt !== null) {
        const match = sortedCats.find(
          (bc) => normalizeCategory(bc) === normalized,
        );
        if (match) favoritedBillCategories.push(match);
      }
    }

    let colorIdx = 0;
    for (const cat of sortedCats) {
      if (!categoryColors[cat]) {
        let attempts = 0;
        while (attempts < DEFAULT_COLORS.length) {
          const candidate = DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
          if (!usedColors.has(candidate.toLowerCase())) {
            categoryColors[cat] = candidate;
            usedColors.add(candidate.toLowerCase());
            colorIdx++;
            break;
          }
          colorIdx++;
          attempts++;
        }
        if (!categoryColors[cat]) {
          categoryColors[cat] = DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
          colorIdx++;
        }
      }
    }
    categoryColors["Total"] = DEFAULT_COLORS[0];

    return {
      bills: billHistory,
      billCategories: sortedCats,
      billCategoryColors: categoryColors,
      favoritedBillCategories,
    };
  }

  // ── Lists ─────────────────────────────────────────────────────────────────

  async getDashboardLists(): Promise<DashboardListsResponse> {
    const db = this.databaseService.get();
    const { start, end } = currentMonthRange();

    const [activeSubscriptions, currentMonthReceipts] = await Promise.all([
      db.select({
        name: subscriptionsTable.name,
        plan: subscriptionPricesTable.plan,
        amount: subscriptionPricesTable.amount,
        recurrence: subscriptionPricesTable.recurrence,
      })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPricesTable,
          eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId),
        )
        .where(
          and(
            sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
            or(
              isNull(subscriptionPricesTable.effectiveUntil),
              sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`,
            ),
          ),
        ),
      db.select({
        merchantName: merchantsTable.name,
        totalAmount: receiptsTable.totalAmount,
      })
        .from(receiptsTable)
        .leftJoin(merchantsTable, eq(merchantsTable.id, receiptsTable.merchantId))
        .where(
          and(
            gte(receiptsTable.receiptDate, start),
            lte(receiptsTable.receiptDate, end),
          ),
        ),
    ]);

    // Build subscriptions list (normalized to monthly amounts)
    const subscriptionsMap: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const s of activeSubscriptions) {
      const name = s.plan ? `${s.name} (${s.plan})` : s.name;
      const amount = parseFloat(String(s.amount));
      if (isNaN(amount)) continue;
      const monthly = toMonthlyAmount(amount, s.recurrence);
      subscriptionsMap[name] = (subscriptionsMap[name] || 0) + monthly;
      totalSubscriptions += monthly;
    }

    const subscriptionsList = Object.entries(subscriptionsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Build receipts list by merchant
    const receiptsMap: Record<string, number> = {};
    let totalReceipts = 0;

    for (const r of currentMonthReceipts) {
      const name = r.merchantName || "Unknown Merchant";
      const amount = parseFloat(String(r.totalAmount));
      if (isNaN(amount)) continue;
      receiptsMap[name] = (receiptsMap[name] || 0) + amount;
      totalReceipts += amount;
    }

    const receiptsList = Object.entries(receiptsMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return {
      subscriptions: subscriptionsList,
      receipts: receiptsList,
      totalSubscriptions,
      totalReceipts,
    };
  }
}

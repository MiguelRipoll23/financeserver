import { desc, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  bankAccountBalancesTable,
  bankAccountCalculationsTable,
  cashBalancesTable,
  cryptoExchangeBalancesTable,
  roboadvisorFundCalculationsTable,
  salaryChangesTable,
} from "../../../../../../db/schema.ts";
import { toMonthlyAmount } from "../dashboard-helpers.ts";
import type { DashboardNetWorthResponse, NetWorthPoint } from "../dashboard-types.ts";

export async function getDashboardNetWorthData(
  db: NodePgDatabase,
): Promise<DashboardNetWorthResponse> {
  const [bankBalances, cashBalances, cryptoBalances, roboadvisorCalcs, bankCalcRows, latestSalary] =
    await Promise.all([
      db.select({
        bankAccountId: bankAccountBalancesTable.bankAccountId,
        balance: bankAccountBalancesTable.balance,
        createdAt: bankAccountBalancesTable.createdAt,
      }).from(bankAccountBalancesTable).orderBy(bankAccountBalancesTable.createdAt).limit(500),
      db.select({
        cashId: cashBalancesTable.cashId,
        balance: cashBalancesTable.balance,
        createdAt: cashBalancesTable.createdAt,
      }).from(cashBalancesTable).orderBy(cashBalancesTable.createdAt).limit(500),
      db.select({
        cryptoExchangeId: cryptoExchangeBalancesTable.cryptoExchangeId,
        symbolCode: cryptoExchangeBalancesTable.symbolCode,
        balance: cryptoExchangeBalancesTable.balance,
        investedAmount: cryptoExchangeBalancesTable.investedAmount,
        createdAt: cryptoExchangeBalancesTable.createdAt,
      }).from(cryptoExchangeBalancesTable).orderBy(cryptoExchangeBalancesTable.createdAt).limit(500),
      db.execute(sql`
        SELECT DISTINCT ON (roboadvisor_id)
          roboadvisor_id, current_value, created_at
        FROM roboadvisor_fund_calculations
        ORDER BY roboadvisor_id, created_at DESC
      `),
      db.select({ monthlyProfit: bankAccountCalculationsTable.monthlyProfit })
        .from(bankAccountCalculationsTable),
      db.select({ netAmount: salaryChangesTable.netAmount, recurrence: salaryChangesTable.recurrence })
        .from(salaryChangesTable)
        .orderBy(desc(salaryChangesTable.date))
        .limit(1),
    ]);

  type BalanceEvent = { date: string; key: string; value: number };
  const events: BalanceEvent[] = [];

  for (const b of bankBalances) {
    const balance = parseFloat(String(b.balance));
    if (!isNaN(balance)) {
      events.push({ date: b.createdAt.toISOString().split("T")[0], key: `bank-${b.bankAccountId}`, value: balance });
    }
  }
  for (const b of cashBalances) {
    const balance = parseFloat(String(b.balance));
    if (!isNaN(balance)) {
      events.push({ date: b.createdAt.toISOString().split("T")[0], key: `cash-${b.cashId}`, value: balance });
    }
  }
  for (const b of cryptoBalances) {
    const balance = parseFloat(String(b.balance));
    if (isNaN(balance)) continue;
    const fallbackValue = b.symbolCode === "USDT" || b.symbolCode === "USDC" ? balance : 0;
    const invested = b.investedAmount ? parseFloat(String(b.investedAmount)) : fallbackValue;
    events.push({ date: b.createdAt.toISOString().split("T")[0], key: `crypto-${b.cryptoExchangeId}-${b.symbolCode}`, value: isNaN(invested) ? fallbackValue : invested });
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

  events.sort((a, b) => a.date.localeCompare(b.date));

  const curBals: Record<string, number> = {};
  const nwByDate: Record<string, number> = {};
  for (const e of events) {
    curBals[e.key] = e.value;
    nwByDate[e.date] = Object.values(curBals).reduce((s, v) => s + v, 0);
  }

  const monthlyMap: Record<string, { date: string; value: number }> = {};
  for (const [date, value] of Object.entries(nwByDate)) {
    const month = date.substring(0, 7);
    if (!monthlyMap[month] || date > monthlyMap[month].date) monthlyMap[month] = { date, value };
  }

  const history = Object.values(monthlyMap).sort((a, b) => a.date.localeCompare(b.date));

  let monthlyInterestIncome = 0;
  for (const c of bankCalcRows) {
    const p = parseFloat(String(c.monthlyProfit));
    if (!isNaN(p)) monthlyInterestIncome += p;
  }

  let monthlySalary = 0;
  if (latestSalary.length > 0) {
    const s = latestSalary[0];
    const amount = parseFloat(String(s.netAmount));
    if (!isNaN(amount)) monthlySalary = toMonthlyAmount(amount, s.recurrence);
  }

  const netWorthPoints: NetWorthPoint[] = history.map((h) => ({ date: h.date, value: h.value }));

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

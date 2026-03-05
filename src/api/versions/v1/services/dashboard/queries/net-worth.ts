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

  for (const bankBalance of bankBalances) {
    const balance = parseFloat(String(bankBalance.balance));
    if (!isNaN(balance)) {
      events.push({ date: bankBalance.createdAt.toISOString().split("T")[0], key: `bank-${bankBalance.bankAccountId}`, value: balance });
    }
  }
  for (const cashBalance of cashBalances) {
    const balance = parseFloat(String(cashBalance.balance));
    if (!isNaN(balance)) {
      events.push({ date: cashBalance.createdAt.toISOString().split("T")[0], key: `cash-${cashBalance.cashId}`, value: balance });
    }
  }
  for (const cryptoBalance of cryptoBalances) {
    const balance = parseFloat(String(cryptoBalance.balance));
    if (isNaN(balance)) continue;
    const fallbackValue = cryptoBalance.symbolCode === "USDT" || cryptoBalance.symbolCode === "USDC" ? balance : 0;
    const invested = cryptoBalance.investedAmount ? parseFloat(String(cryptoBalance.investedAmount)) : fallbackValue;
    events.push({ date: cryptoBalance.createdAt.toISOString().split("T")[0], key: `crypto-${cryptoBalance.cryptoExchangeId}-${cryptoBalance.symbolCode}`, value: isNaN(invested) ? fallbackValue : invested });
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

  const currentBalances: Record<string, number> = {};
  const netWorthByDate: Record<string, number> = {};
  for (const eventEntry of events) {
    currentBalances[eventEntry.key] = eventEntry.value;
    netWorthByDate[eventEntry.date] = Object.values(currentBalances).reduce((s, v) => s + v, 0);
  }

  const monthlyMap: Record<string, { date: string; value: number }> = {};
  for (const [date, value] of Object.entries(netWorthByDate)) {
    const month = date.substring(0, 7);
    if (!monthlyMap[month] || date > monthlyMap[month].date) monthlyMap[month] = { date, value };
  }

  const history = Object.values(monthlyMap).sort((a, b) => a.date.localeCompare(b.date));

  let monthlyInterestIncome = 0;
  for (const bankCalcRow of bankCalcRows) {
    const parsedProfit = parseFloat(String(bankCalcRow.monthlyProfit));
    if (!isNaN(parsedProfit)) monthlyInterestIncome += parsedProfit;
  }

  let monthlySalary = 0;
  if (latestSalary.length > 0) {
    const salaryRecord = latestSalary[0];
    const amount = parseFloat(String(salaryRecord.netAmount));
    if (!isNaN(amount)) monthlySalary = toMonthlyAmount(amount, salaryRecord.recurrence);
  }

  const netWorthPoints: NetWorthPoint[] = history.map((h) => ({ date: h.date, value: h.value }));

  if (history.length > 0) {
    const last = history[history.length - 1];
    netWorthPoints[netWorthPoints.length - 1].projection = last.value;
    for (let i = 1; i <= 6; i++) {
      const projectionDate = new Date(last.date);
      projectionDate.setMonth(projectionDate.getMonth() + i);
      netWorthPoints.push({
        date: projectionDate.toISOString().split("T")[0],
        projection: last.value + monthlyInterestIncome * i + monthlySalary * i,
      });
    }
  }

  return { netWorth: netWorthPoints };
}

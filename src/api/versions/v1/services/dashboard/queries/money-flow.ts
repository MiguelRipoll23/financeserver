import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  bankAccountCalculationsTable,
  billsTable,
  receiptsTable,
  salaryChangesTable,
  subscriptionPricesTable,
  subscriptionsTable,
} from "../../../../../../db/schema.ts";
import { computeProjectedBillsAmount, currentMonthRange, toMonthlyAmount } from "../dashboard-helpers.ts";
import type { DashboardMoneyFlowResponse } from "../dashboard-types.ts";

export async function getDashboardMoneyFlowData(
  db: NodePgDatabase,
): Promise<DashboardMoneyFlowResponse> {
  const { start, end } = currentMonthRange();

  const [bankCalcs, monthBills, monthReceipts, activeSubscriptions, latestSalary, latestRecurringBillsResult] =
    await Promise.all([
      db.select({ monthlyProfit: bankAccountCalculationsTable.monthlyProfit })
        .from(bankAccountCalculationsTable),
      db.select({ totalAmount: billsTable.totalAmount, categoryId: billsTable.categoryId })
        .from(billsTable)
        .where(and(gte(billsTable.billDate, start), lte(billsTable.billDate, end))),
      db.select({ totalAmount: receiptsTable.totalAmount })
        .from(receiptsTable)
        .where(and(gte(receiptsTable.receiptDate, start), lte(receiptsTable.receiptDate, end))),
      db.select({ amount: subscriptionPricesTable.amount, recurrence: subscriptionPricesTable.recurrence })
        .from(subscriptionsTable)
        .innerJoin(subscriptionPricesTable, eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId))
        .where(and(
          sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
          or(isNull(subscriptionPricesTable.effectiveUntil), sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`),
        )),
      db.select({ netAmount: salaryChangesTable.netAmount, recurrence: salaryChangesTable.recurrence })
        .from(salaryChangesTable)
        .orderBy(desc(salaryChangesTable.date))
        .limit(1),
      // Recurring bills ordered latest-first per category (for projection)
      db.execute(sql`
        SELECT DISTINCT ON (category_id)
          category_id, total_amount, recurrence, bill_date
        FROM bills
        WHERE recurrence IS NOT NULL
        ORDER BY category_id, bill_date DESC
      `),
    ]);

  let monthlyInterestIncome = 0;
  for (const c of bankCalcs) {
    const p = parseFloat(String(c.monthlyProfit));
    if (!isNaN(p)) monthlyInterestIncome += p;
  }

  let billsOut = 0;
<<<<<<< HEAD
  const categoriesWithBillsThisMonth = new Set<number>();
  for (const b of monthBills) {
    const a = parseFloat(String(b.totalAmount));
    if (!isNaN(a)) billsOut += a;
    categoriesWithBillsThisMonth.add(b.categoryId);
  }

  // Add projected amounts for recurring bills
  const recurringBills = latestRecurringBillsResult.rows.map((row) => ({
    categoryId: Number(row.category_id),
    totalAmount: String(row.total_amount),
    recurrence: String(row.recurrence),
    billDate: String(row.bill_date).split("T")[0],
  }));
  billsOut += computeProjectedBillsAmount(recurringBills, categoriesWithBillsThisMonth, start, end);

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
    if (!isNaN(amount)) monthlySalary = toMonthlyAmount(amount, s.recurrence);
  }

  const totalIn = Math.max(monthlySalary, 0) + Math.max(monthlyInterestIncome, 0);
  const totalOut = Math.max(billsOut, 0) + Math.max(receiptsOut, 0) + Math.max(subscriptionsOut, 0);

  const nodeNames = ["Salary", "Interest", "Liquid Money", "Bills", "Merchants", "Subscriptions"] as const;
  const getIdx = (name: (typeof nodeNames)[number]) => nodeNames.indexOf(name);

  const numericLinks = [
    { source: getIdx("Salary"), target: getIdx("Liquid Money"), value: Math.max(monthlySalary, 0) },
    { source: getIdx("Interest"), target: getIdx("Liquid Money"), value: Math.max(monthlyInterestIncome, 0) },
    { source: getIdx("Liquid Money"), target: getIdx("Bills"), value: Math.max(billsOut, 0) },
    { source: getIdx("Liquid Money"), target: getIdx("Merchants"), value: Math.max(receiptsOut, 0) },
    { source: getIdx("Liquid Money"), target: getIdx("Subscriptions"), value: Math.max(subscriptionsOut, 0) },
  ].filter((link) => link.value > 0);

  const links = numericLinks.map((link) => ({ ...link, value: link.value.toFixed(2) }));

  return {
    liquidFlow: { nodes: nodeNames.map((name) => ({ name })), links },
    liquidFlowSummary: {
      gained: totalIn.toFixed(2),
      lost: totalOut.toFixed(2),
      netChange: (totalIn - totalOut).toFixed(2),
    },
  };
}

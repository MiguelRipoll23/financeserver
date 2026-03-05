<<<<<<< HEAD
import { and, desc, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
=======
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
>>>>>>> origin/main
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  bankAccountBalancesTable,
  bankAccountCalculationsTable,
  billsTable,
  cashBalancesTable,
  cryptoExchangeBalancesTable,
  cryptoExchangeCalculationsTable,
  receiptsTable,
  roboadvisorBalances,
  roboadvisorFundCalculationsTable,
  salaryChangesTable,
  subscriptionPricesTable,
  subscriptionsTable,
} from "../../../../../../db/schema.ts";
<<<<<<< HEAD
import { computeProjectedBillsAmount, currentMonthRange, toMonthlyAmount } from "../dashboard-helpers.ts";
=======
import { currentMonthRange, toMonthlyAmount } from "../dashboard-helpers.ts";
>>>>>>> origin/main
import type { DashboardKpisResponse } from "../dashboard-types.ts";

export async function getDashboardKpisData(
  db: NodePgDatabase,
): Promise<DashboardKpisResponse> {
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
<<<<<<< HEAD
    latestRecurringBillsResult,
=======
>>>>>>> origin/main
  ] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (bank_account_id)
        bank_account_id, balance, currency_code
      FROM bank_account_balances
      ORDER BY bank_account_id, created_at DESC
    `),
    db.execute(sql`
      SELECT DISTINCT ON (cash_id)
        cash_id, balance, currency_code
      FROM cash_balances
      ORDER BY cash_id, created_at DESC
    `),
    db.select({
      monthlyProfit: bankAccountCalculationsTable.monthlyProfit,
      currencyCode: bankAccountCalculationsTable.currencyCode,
    }).from(bankAccountCalculationsTable),
    db.select({ currentValue: cryptoExchangeCalculationsTable.currentValue })
      .from(cryptoExchangeCalculationsTable),
    db.execute(sql`
      SELECT DISTINCT ON (crypto_exchange_id, symbol_code)
        crypto_exchange_id, symbol_code, balance, invested_amount
      FROM crypto_exchange_balances
      ORDER BY crypto_exchange_id, symbol_code, created_at DESC
    `),
    db.select({ currentValue: roboadvisorFundCalculationsTable.currentValue })
      .from(roboadvisorFundCalculationsTable),
    db.select({ type: roboadvisorBalances.type, amount: roboadvisorBalances.amount })
      .from(roboadvisorBalances),
<<<<<<< HEAD
    db.select({ totalAmount: billsTable.totalAmount, categoryId: billsTable.categoryId })
=======
    db.select({ totalAmount: billsTable.totalAmount })
>>>>>>> origin/main
      .from(billsTable)
      .where(and(gte(billsTable.billDate, start), lte(billsTable.billDate, end))),
    db.select({ totalAmount: receiptsTable.totalAmount })
      .from(receiptsTable)
      .where(and(gte(receiptsTable.receiptDate, start), lte(receiptsTable.receiptDate, end))),
    db.select({
      amount: subscriptionPricesTable.amount,
      recurrence: subscriptionPricesTable.recurrence,
    })
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
<<<<<<< HEAD
    // Recurring bills ordered latest-first per category (for projection)
    db.execute(sql`
      SELECT DISTINCT ON (category_id)
        category_id, total_amount, recurrence, bill_date
      FROM bills
      WHERE recurrence IS NOT NULL
      ORDER BY category_id, bill_date DESC
    `),
=======
>>>>>>> origin/main
  ]);

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

  let monthlyInterestIncome = 0;
  for (const calc of bankCalcs) {
    const profit = parseFloat(String(calc.monthlyProfit));
    if (!isNaN(profit)) monthlyInterestIncome += profit;
    if (calc.currencyCode) currencyCode = calc.currencyCode;
  }

  let totalCryptoValue = 0;
  for (const calc of allCryptoCalcs) {
    const val = parseFloat(String(calc.currentValue));
    if (!isNaN(val)) totalCryptoValue += val;
  }

  let totalCryptoCost = 0;
  for (const row of latestCryptoRows.rows) {
    const invested = row.invested_amount ? parseFloat(String(row.invested_amount)) : 0;
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

  let monthlyBills = 0;
  const categoriesWithBillsThisMonth = new Set<number>();
  for (const bill of monthBills) {
    const amount = parseFloat(String(bill.totalAmount));
    if (!isNaN(amount)) monthlyBills += amount;
    categoriesWithBillsThisMonth.add(bill.categoryId);
  }

  // Add projected amounts for recurring bills not yet recorded this month
  const recurringBills = latestRecurringBillsResult.rows.map((row) => ({
    categoryId: Number(row.category_id),
    totalAmount: String(row.total_amount),
    recurrence: String(row.recurrence),
    billDate: String(row.bill_date).split("T")[0],
  }));
  monthlyBills += computeProjectedBillsAmount(recurringBills, categoriesWithBillsThisMonth, start, end);

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

  let monthlySalary = 0;
  if (latestSalary.length > 0) {
    const salary = latestSalary[0];
    const amount = parseFloat(String(salary.netAmount));
    if (!isNaN(amount)) monthlySalary = toMonthlyAmount(amount, salary.recurrence);
  }

  return {
    liquidMoney: liquidMoney.toFixed(2),
    investedMoney: (totalCryptoValue + totalRoboadvisorValue).toFixed(2),
    totalInvestedCost: (totalCryptoCost + totalRoboadvisorCost).toFixed(2),
    monthlyInterestIncome: monthlyInterestIncome.toFixed(2),
    totalMonthlyIncome: (Math.max(monthlySalary, 0) + Math.max(monthlyInterestIncome, 0)).toFixed(2),
    monthlyBills: monthlyBills.toFixed(2),
    monthlyReceipts: monthlyReceipts.toFixed(2),
    monthlySubscriptions: monthlySubscriptions.toFixed(2),
    currencyCode,
  };
}

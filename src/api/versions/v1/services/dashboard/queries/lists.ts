import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  merchantsTable,
  receiptsTable,
  subscriptionPricesTable,
  subscriptionsTable,
} from "../../../../../../db/schema.ts";
import { currentMonthRange, toMonthlyAmount } from "../dashboard-helpers.ts";
import type { DashboardListsResponse } from "../dashboard-types.ts";

export async function getDashboardListsData(
  db: NodePgDatabase,
): Promise<DashboardListsResponse> {
  const { start, end } = currentMonthRange();

  const [activeSubscriptions, currentMonthReceipts] = await Promise.all([
    db.select({
      name: subscriptionsTable.name,
      plan: subscriptionPricesTable.plan,
      amount: subscriptionPricesTable.amount,
      recurrence: subscriptionPricesTable.recurrence,
    })
      .from(subscriptionsTable)
      .innerJoin(subscriptionPricesTable, eq(subscriptionsTable.id, subscriptionPricesTable.subscriptionId))
      .where(and(
        sql`${subscriptionPricesTable.effectiveFrom} <= CURRENT_DATE`,
        or(isNull(subscriptionPricesTable.effectiveUntil), sql`${subscriptionPricesTable.effectiveUntil} >= CURRENT_DATE`),
      )),
    db.select({ merchantName: merchantsTable.name, totalAmount: receiptsTable.totalAmount })
      .from(receiptsTable)
      .leftJoin(merchantsTable, eq(merchantsTable.id, receiptsTable.merchantId))
      .where(and(gte(receiptsTable.receiptDate, start), lte(receiptsTable.receiptDate, end))),
  ]);

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

  const receiptsMap: Record<string, number> = {};
  let totalReceipts = 0;
  for (const r of currentMonthReceipts) {
    const name = r.merchantName || "Unknown Merchant";
    const amount = parseFloat(String(r.totalAmount));
    if (isNaN(amount)) continue;
    receiptsMap[name] = (receiptsMap[name] || 0) + amount;
    totalReceipts += amount;
  }

  return {
    subscriptions: Object.entries(subscriptionsMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    receipts: Object.entries(receiptsMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
    totalSubscriptions,
    totalReceipts,
  };
}

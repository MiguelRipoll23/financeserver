<<<<<<< HEAD
import { desc, eq, isNotNull, sql } from "drizzle-orm";
=======
import { desc, eq } from "drizzle-orm";
>>>>>>> origin/main
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  billCategoriesTable,
  billsTable,
} from "../../../../../../db/schema.ts";
<<<<<<< HEAD
import { computeProjectedBillsAmount, currentMonthRange, normalizeCategory } from "../dashboard-helpers.ts";
=======
import { normalizeCategory } from "../dashboard-helpers.ts";
>>>>>>> origin/main
import type { DashboardMonthlyExpensesResponse } from "../dashboard-types.ts";

const DEFAULT_COLORS = ["#10b981", "#3b82f6", "#f87171", "#fbbf24", "#a78bfa", "#f472b6", "#2dd4bf"];

export async function getDashboardMonthlyExpensesData(
  db: NodePgDatabase,
): Promise<DashboardMonthlyExpensesResponse> {
<<<<<<< HEAD
  const { start, end } = currentMonthRange();

  const [allBills, allCategories, latestRecurringBillsResult] = await Promise.all([
    db.select({
      billDate: billsTable.billDate,
      totalAmount: billsTable.totalAmount,
  const [allBills, allCategories, latestRecurringBillsResult] = await Promise.all([
    db.select({
      billDate: billsTable.billDate,
      totalAmount: billsTable.totalAmount,
      categoryId: billsTable.categoryId,
      categoryName: billCategoriesTable.name,
    })
      .from(billsTable)
      .innerJoin(billCategoriesTable, eq(billCategoriesTable.id, billsTable.categoryId))
      .orderBy(desc(billsTable.billDate))
      .limit(500),
    db.select({
      name: billCategoriesTable.name,
      hexColor: billCategoriesTable.hexColor,
      favoritedAt: billCategoriesTable.favoritedAt,
    }).from(billCategoriesTable),
    db.execute(sql`
      SELECT DISTINCT ON (category_id)
        category_id, total_amount, recurrence, bill_date,
        (SELECT name FROM bill_categories WHERE id = bills.category_id) AS category_name
      FROM bills
      WHERE recurrence IS NOT NULL
      ORDER BY category_id, bill_date DESC
    `),
  ]);

  const billsMap: Record<string, Record<string, string | number | null>> = {};
  const billCategoriesSet = new Set<string>();

  const currentMonth = start.substring(0, 7);

  for (const bill of allBills) {
    const billDateString = typeof bill.billDate === "string"
      ? bill.billDate
      : (bill.billDate as Date).toISOString().split("T")[0];
    const month = billDateString.substring(0, 7);
    if (!billsMap[month]) billsMap[month] = { date: month };
    const normalizedCategory = normalizeCategory(bill.categoryName);
    billCategoriesSet.add(normalizedCategory);
    const parsedAmount = parseFloat(String(bill.totalAmount || "0"));
    billsMap[month][normalizedCategory] = ((billsMap[month][normalizedCategory] as number) || 0) + (isNaN(parsedAmount) ? 0 : parsedAmount);
  }

  // Inject projected recurring bills into current month bucket
  const categoriesWithBillsThisMonth = new Set(
    allBills
      .filter((bill) => {
        const billDateString = typeof bill.billDate === "string"
          ? bill.billDate
          : (bill.billDate as Date).toISOString().split("T")[0];
        return billDateString.substring(0, 7) === currentMonth;
      })
      .map((bill) => bill.categoryId),
  );

  for (const row of latestRecurringBillsResult.rows) {
    const categoryId = Number(row.category_id);

    const billDate = String(row.bill_date).split("T")[0];
    const recurrence = String(row.recurrence);
    const projected = computeProjectedBillsAmount(
      [{ categoryId, totalAmount: String(row.total_amount), recurrence, billDate }],
      categoriesWithBillsThisMonth,
      start,
      end,
    );

    if (projected > 0) {
      const normalizedCategory = normalizeCategory(String(row.category_name));
      billCategoriesSet.add(normalizedCategory);
      if (!billsMap[currentMonth]) billsMap[currentMonth] = { date: currentMonth };
      billsMap[currentMonth][normalizedCategory] =
        ((billsMap[currentMonth][normalizedCategory] as number) || 0) + projected;
    }
  }

=======
>>>>>>> origin/main
  const sortedCats = Array.from(billCategoriesSet);

  const billHistory = Object.keys(billsMap).sort().map((month) => {
    const monthData = { ...billsMap[month] };
    let total = 0;
    sortedCats.forEach((category) => {
      if (monthData[category] === undefined) monthData[category] = null;
      else total += monthData[category] as number;
    });
    monthData["Total"] = total;
    return monthData;
  });

  // Linear regression trend lines per category
  for (const category of [...sortedCats, "Total"]) {
    const dataPoints = billHistory
      .map((monthData, i) => ({ x: i, y: monthData[category] }))
      .filter((point) => point.y !== null && point.y !== undefined);

    if (dataPoints.length > 1) {
      const n = dataPoints.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (const dataPoint of dataPoints) {
        sumX += dataPoint.x;
        sumY += dataPoint.y as number;
        sumXY += dataPoint.x * (dataPoint.y as number);
        sumX2 += dataPoint.x * dataPoint.x;
      }
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        billHistory.forEach((monthData, i) => { monthData[`${category} Trend`] = slope * i + intercept; });
      }
    }
  }

  const categoryColors: Record<string, string> = {};
  const usedColors = new Set<string>();
  const favoritedBillCategories: string[] = [];

  for (const categoryRecord of allCategories) {
    if (!categoryRecord.name) continue;
    const normalized = normalizeCategory(categoryRecord.name);
    if (categoryRecord.hexColor) {
      categoryColors[normalized] = categoryRecord.hexColor;
      usedColors.add(categoryRecord.hexColor.toLowerCase());
    }
    if (categoryRecord.favoritedAt !== null) {
      const match = sortedCats.find((billCategory) => normalizeCategory(billCategory) === normalized);
      if (match) favoritedBillCategories.push(match);
    }
  }

  let colorIdx = 0;
  for (const category of sortedCats) {
    if (!categoryColors[category]) {
      let attempts = 0;
      while (attempts < DEFAULT_COLORS.length) {
        const candidate = DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
        if (!usedColors.has(candidate.toLowerCase())) {
          categoryColors[category] = candidate;
          usedColors.add(candidate.toLowerCase());
          colorIdx++;
          break;
        }
        colorIdx++;
        attempts++;
      }
      if (!categoryColors[category]) {
        categoryColors[category] = DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
        colorIdx++;
      }
    }
  }
  categoryColors["Total"] = DEFAULT_COLORS[0];

  return { bills: billHistory, billCategories: sortedCats, billCategoryColors: categoryColors, favoritedBillCategories };
}

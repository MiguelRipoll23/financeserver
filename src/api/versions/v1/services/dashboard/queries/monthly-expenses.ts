import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  billCategoriesTable,
  billsTable,
} from "../../../../../../db/schema.ts";
import { normalizeCategory } from "../dashboard-helpers.ts";
import type { DashboardMonthlyExpensesResponse } from "../dashboard-types.ts";

const DEFAULT_COLORS = ["#10b981", "#3b82f6", "#f87171", "#fbbf24", "#a78bfa", "#f472b6", "#2dd4bf"];

export async function getDashboardMonthlyExpensesData(
  db: NodePgDatabase,
): Promise<DashboardMonthlyExpensesResponse> {
  const [allBills, allCategories] = await Promise.all([
    db.select({
      billDate: billsTable.billDate,
      totalAmount: billsTable.totalAmount,
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
  ]);

  const billsMap: Record<string, Record<string, string | number | null>> = {};
  const billCategoriesSet = new Set<string>();

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
      const match = sortedCats.find((bc) => normalizeCategory(bc) === normalized);
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

  return { bills: billHistory, billCategories: sortedCats, billCategoryColors: categoryColors, favoritedBillCategories };
}

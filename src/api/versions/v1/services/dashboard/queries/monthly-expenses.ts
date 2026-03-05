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

  for (const b of allBills) {
    const dateStr = typeof b.billDate === "string"
      ? b.billDate
      : (b.billDate as Date).toISOString().split("T")[0];
    const month = dateStr.substring(0, 7);
    if (!billsMap[month]) billsMap[month] = { date: month };
    const cat = normalizeCategory(b.categoryName);
    billCategoriesSet.add(cat);
    const amount = parseFloat(String(b.totalAmount || "0"));
    billsMap[month][cat] = ((billsMap[month][cat] as number) || 0) + (isNaN(amount) ? 0 : amount);
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

  // Linear regression trend lines per category
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
        billHistory.forEach((p, i) => { p[`${cat} Trend`] = slope * i + intercept; });
      }
    }
  }

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

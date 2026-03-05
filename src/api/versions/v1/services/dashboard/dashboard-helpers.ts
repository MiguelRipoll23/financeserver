export function toMonthlyAmount(amount: number, recurrence: string): number {
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

export function normalizeCategory(name: string): string {
  if (!name) return "Uncategorized";
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Returns the next expected date for a recurring bill based on its last date and recurrence.
 */
export function nextExpectedDate(lastDate: string, recurrence: string): Date {
  const date = new Date(lastDate);
  switch (recurrence) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "bi-weekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

/**
 * Returns the total projected amount for recurring bills that have no entry yet in
 * the current month.  Each category is counted at most once.
 *
 * @param recurringBills - bills with a recurrence set, ordered latest-first per category
 * @param categoriesWithBillsThisMonth - set of categoryId values that already have a bill
 * @param monthStart - first day of current month (YYYY-MM-DD)
 * @param monthEnd - last day of current month (YYYY-MM-DD)
 */
export function computeProjectedBillsAmount(
  recurringBills: { categoryId: number; totalAmount: string; recurrence: string; billDate: string }[],
  categoriesWithBillsThisMonth: Set<number>,
  monthStart: string,
  monthEnd: string,
): number {
  const seen = new Set<number>();
  let total = 0;

  for (const bill of recurringBills) {
    if (seen.has(bill.categoryId)) continue;
    seen.add(bill.categoryId);

    // Start from the next expected date after the last known bill date
    let next = nextExpectedDate(bill.billDate, bill.recurrence);

    // Iterate through all occurrences while within the monthEnd
    while (next.toISOString().split("T")[0] <= monthEnd) {
      const nextStr = next.toISOString().split("T")[0];
      if (nextStr >= monthStart && nextStr <= monthEnd) {
        const amount = parseFloat(String(bill.totalAmount));
        if (!isNaN(amount)) total += amount;
      }
      // Move to the following expected date
      next = nextExpectedDate(next.toISOString(), bill.recurrence);
      // Safety: break if recurrence is unrecognized to avoid infinite loop
      if (next.toString() === "Invalid Date") break;
    }
  }

  return total;
}

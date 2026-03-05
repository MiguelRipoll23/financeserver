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

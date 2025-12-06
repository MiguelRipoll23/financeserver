export const toISOStringSafe = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "Invalid date"
      : parsed.toISOString();
  }

  return "Invalid date";
};

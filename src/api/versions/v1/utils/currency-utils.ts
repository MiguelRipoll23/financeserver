export function getCurrencySymbolForCode(currencyCode: string): string {
  const symbolMap: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CHF: "CHF",
    CAD: "C$",
    AUD: "A$",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
    MXN: "$",
    KRW: "₩",
  };

  return symbolMap[currencyCode.toUpperCase()] || currencyCode;
}

import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  bankAccountBalancesTable,
  cashBalancesTable,
  cryptoExchangeCalculationsTable,
  roboadvisorFundCalculationsTable,
} from "../../../../../../db/schema.ts";
import type { DashboardPortfolioResponse } from "../dashboard-types.ts";

export async function getDashboardPortfolioData(
  db: NodePgDatabase,
): Promise<DashboardPortfolioResponse> {
  const [latestBankRows, latestCashRows, allCryptoCalcs, roboadvisorCalcs] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (bank_account_id)
        bank_account_id, balance
      FROM bank_account_balances
      ORDER BY bank_account_id, created_at DESC
    `),
    db.execute(sql`
      SELECT DISTINCT ON (cash_id)
        cash_id, balance
      FROM cash_balances
      ORDER BY cash_id, created_at DESC
    `),
    db.select({ currentValue: cryptoExchangeCalculationsTable.currentValue })
      .from(cryptoExchangeCalculationsTable),
    db.select({ currentValue: roboadvisorFundCalculationsTable.currentValue })
      .from(roboadvisorFundCalculationsTable),
  ]);

  let liquidMoney = 0;
  for (const row of latestBankRows.rows) {
    const b = parseFloat(String(row.balance));
    if (!isNaN(b)) liquidMoney += b;
  }
  for (const row of latestCashRows.rows) {
    const b = parseFloat(String(row.balance));
    if (!isNaN(b)) liquidMoney += b;
  }

  let investedMoney = 0;
  for (const c of allCryptoCalcs) {
    const v = parseFloat(String(c.currentValue));
    if (!isNaN(v)) investedMoney += v;
  }
  for (const c of roboadvisorCalcs) {
    const v = parseFloat(String(c.currentValue));
    if (!isNaN(v)) investedMoney += v;
  }

  return {
    portfolio: [
      { name: "Liquid", value: liquidMoney },
      { name: "Invested", value: investedMoney },
    ],
  };
}

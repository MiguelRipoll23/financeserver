
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { cashTable, cashBalancesTable } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  const db = drizzle(client);

  console.log("Checking Cash...");
  const cashList = await db.select().from(cashTable);
  console.log("Cash List:", cashList);

  console.log("Checking Cash Balances...");
  const balanceList = await db.select().from(cashBalancesTable);
  console.log("Balance List:", balanceList);
  
  if (cashList.length > 0) {
      const firstCashId = cashList[0].id;
      console.log(`Checking balances for Cash ID: ${firstCashId}`);
      const specificBalances = await db.select().from(cashBalancesTable).where(eq(cashBalancesTable.cashId, firstCashId));
      console.log(`Balances for Cash ID ${firstCashId}:`, specificBalances);

      if (specificBalances.length === 0) {
          console.log("Inserting a test balance...");
          await db.insert(cashBalancesTable).values({
              cashId: firstCashId,
              balance: "100.50",
              currencyCode: "USD"
          });
          const newBalances = await db.select().from(cashBalancesTable).where(eq(cashBalancesTable.cashId, firstCashId));
          console.log("New Balances:", newBalances);
      }
  }

  await client.end();
}

main().catch(console.error);

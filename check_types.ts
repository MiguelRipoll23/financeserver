
import pg from 'pg';
async function main() {
    const client = new pg.Client({connectionString: process.env.DATABASE_URL});
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cash_balances'");
    console.log(res.rows);
    
    const res2 = await client.query("SELECT * FROM cash_balances");
    console.log("Rows:", res2.rows);
    
    await client.end();
}
main();

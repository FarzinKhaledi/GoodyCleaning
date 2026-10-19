import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const migration = await readFile(new URL("../drizzle/0003_quote_discounts.sql", import.meta.url), "utf8");
    await sql.begin(async (transaction) => { await transaction.unsafe(migration); });
    console.log("Quote discount migration applied. Existing quotes retain their fixed discounts.");
  } finally { await sql.end({ timeout: 2 }); }
}

main().catch(() => {
  console.error("Quote discount migration failed. Check database connectivity and schema; credentials are not printed.");
  process.exitCode = 1;
});

import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--email") throw new Error("Provide --email for the explicitly approved super admin.");
  const email = z.email().parse(args[1].trim().toLowerCase());
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const migration = await readFile(new URL("../drizzle/0002_google_admin.sql", import.meta.url), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(migration);
      const existing = await tx<{ id: string; email: string }[]>`SELECT id, email FROM admins WHERE lower(email) = ${email} FOR UPDATE`;
      if (existing.length > 1) throw new Error("Ambiguous admin records; review before provisioning.");
      if (existing.length === 1) {
        await tx`UPDATE admins SET role = 'SUPER_ADMIN', is_active = true WHERE id = ${existing[0].id}`;
      } else {
        await tx`INSERT INTO admins (email, password_hash, role, is_active) VALUES (${email}, NULL, 'SUPER_ADMIN', true)`;
      }
    });
    console.log("Google admin schema applied and the explicitly approved super-admin account provisioned. Existing passwords and Google identity bindings preserved.");
  } finally { await sql.end({ timeout: 2 }); }
}

main().catch(() => {
  console.error("Google admin setup failed. Check the approved email and database access; private details are not printed.");
  process.exitCode = 1;
});

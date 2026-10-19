import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function seed() {
  const { requireDb } = await import("../src/lib/db");
  const { admins } = await import("../src/lib/db/schema");
  const db = requireDb();

  const adminEmail = process.env.ADMIN_EMAIL_LOGIN?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !z.email().safeParse(adminEmail).success) {
    throw new Error("Seed configuration: set ADMIN_EMAIL_LOGIN to a valid email address.");
  }
  if (!adminPassword || adminPassword.trim().length < 12) {
    throw new Error("Seed configuration: set an explicit ADMIN_PASSWORD with at least 12 characters.");
  }
  if (Buffer.byteLength(adminPassword, "utf8") > 72) {
    throw new Error("Seed configuration: ADMIN_PASSWORD must fit within bcrypt’s 72-byte limit.");
  }

  const [existingAdmin] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, adminEmail))
    .limit(1);

  if (existingAdmin) {
    console.log("Admin account already exists. Its password has not been changed.");
    console.log("Use a deliberate password reset process to rotate existing credentials.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await db.insert(admins).values({ email: adminEmail, passwordHash });
  console.log("Created admin account. No sample customer reviews were inserted.");
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    console.error(
      message.startsWith("Seed configuration:") || message === "DATABASE_URL is not configured"
        ? message
        : "Seed failed. Check database access and schema setup; no credentials are printed.",
    );
    process.exit(1);
  });

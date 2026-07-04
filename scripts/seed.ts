import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";

config({ path: ".env.local" });
config();

const SEED_TESTIMONIALS = [
  {
    name: "Sarah M.",
    rating: 5,
    message:
      "Absolutely spotless! The end of tenancy clean saved our deposit. Professional, punctual, and thorough.",
  },
  {
    name: "James T.",
    rating: 5,
    message:
      "Our carpets look brand new. The team was friendly and the eco-friendly products smelled fresh, not chemical.",
  },
  {
    name: "Emma L.",
    rating: 5,
    message:
      "Best deep clean we've ever had. Every corner was addressed. Will definitely book again.",
  },
  {
    name: "David R.",
    rating: 5,
    message:
      "Competitive pricing and outstanding results. They handled our 2-bed flat in under 4 hours.",
  },
  {
    name: "Priya K.",
    rating: 5,
    message:
      "Used Goodycleaning for our office. Minimal disruption, excellent communication throughout.",
  },
  {
    name: "Michael B.",
    rating: 5,
    message:
      "From booking to completion, everything was seamless. Highly recommend!",
  },
];

async function seed() {
  const { requireDb } = await import("../src/lib/db");
  const { admins, testimonials } = await import("../src/lib/db/schema");
  const db = requireDb();

  const adminEmail = process.env.ADMIN_EMAIL_LOGIN ?? "admin@goodycleaning.co.uk";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  const [existingAdmin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, adminEmail))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(admins).values({ email: adminEmail, passwordHash });
    console.log(`Created admin: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  const [{ value: testimonialCount }] = await db
    .select({ value: count() })
    .from(testimonials);

  if (testimonialCount === 0) {
    await db.insert(testimonials).values(SEED_TESTIMONIALS);
    console.log(`Seeded ${SEED_TESTIMONIALS.length} testimonials`);
  } else {
    console.log(`Testimonials already exist (${testimonialCount}), skipping`);
  }
}

seed()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

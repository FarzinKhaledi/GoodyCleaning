import { desc } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { DashboardClient } from "./DashboardClient";

async function getEnquiries() {
  try {
    const enquiries = await requireDb().select({
      id: quotes.id, name: quotes.name, email: quotes.email, phone: quotes.phone,
      serviceType: quotes.serviceType, propertySize: quotes.propertySize, postcode: quotes.postcode,
      status: quotes.status, priceCents: quotes.priceCents, createdAt: quotes.createdAt,
      quoteEmailSentAt: quotes.quoteEmailSentAt, sendStartedAt: quotes.sendStartedAt,
    }).from(quotes).orderBy(desc(quotes.createdAt));
    return { quotes: enquiries, available: true, loadedAt: Date.now() };
  } catch {
    return { quotes: [], available: false, loadedAt: Date.now() };
  }
}

export default async function AdminDashboard() {
  return <DashboardClient {...await getEnquiries()} />;
}

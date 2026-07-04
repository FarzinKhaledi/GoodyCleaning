import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { QuoteDetailClient } from "./QuoteDetailClient";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quote;
  try {
    const db = requireDb();
    [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  } catch {
    notFound();
  }

  if (!quote) notFound();

  const serviceLabel =
    SERVICE_LABELS[quote.serviceType as keyof typeof SERVICE_LABELS] ??
    quote.serviceType;
  const propertyLabel =
    PROPERTY_SIZE_LABELS[
      quote.propertySize as keyof typeof PROPERTY_SIZE_LABELS
    ] ?? quote.propertySize;

  return (
    <QuoteDetailClient
      quote={quote}
      serviceLabel={serviceLabel}
      propertyLabel={propertyLabel}
    />
  );
}

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { QuoteDetailClient } from "./QuoteDetailClient";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  let quote;
  try {
    const db = requireDb();
    [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f4] p-6 text-navy">
        <div className="w-full max-w-lg rounded-3xl border border-navy/10 bg-white p-8">
          <BrandLogo href="/admin" contained width={130} height={87} />
          <AlertCircle className="mb-4 mt-8 h-7 w-7 text-amber-600" />
          <h1 className="text-2xl font-semibold">This enquiry could not be loaded</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">The database is currently unavailable. Please try again when the connection is restored.</p>
          <Button asChild variant="outline" className="mt-6"><Link href="/admin">Back to enquiries</Link></Button>
        </div>
      </main>
    );
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

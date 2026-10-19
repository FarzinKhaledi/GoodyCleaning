import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth/admin-access";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { buildCustomerQuotePreview } from "@/lib/mail/quote-preview";

export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Sign in to preview quotes." }, { status: 401, headers: privateHeaders });
    }
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid quote ID." }, { status: 400, headers: privateHeaders });
    }
    const [quote] = await requireDb().select({
      id: quotes.id, name: quotes.name, email: quotes.email, phone: quotes.phone,
      serviceType: quotes.serviceType, propertySize: quotes.propertySize,
      postcode: quotes.postcode, preferredDate: quotes.preferredDate,
      lineItems: quotes.lineItems, discountCents: quotes.discountCents,
      discountType: quotes.discountType, discountBasisPoints: quotes.discountBasisPoints,
      priceCents: quotes.priceCents, customerNotes: quotes.customerNotes,
      checkoutUrl: quotes.checkoutUrl, version: quotes.version,
    }).from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404, headers: privateHeaders });

    if ((!quote.lineItems.length && !quote.priceCents) || quote.priceCents === null) {
      return NextResponse.json({ error: "Save a complete quote before previewing the email." }, { status: 400, headers: privateHeaders });
    }
    return NextResponse.json(await buildCustomerQuotePreview(quote), { headers: privateHeaders });
  } catch {
    // Customer details and provider configuration must never enter diagnostic output.
    console.error("[quotes] Customer email preview unavailable.");
    return NextResponse.json({ error: "The email preview could not be loaded. Check and save your quote, then try again." }, { status: 503, headers: privateHeaders });
  }
}

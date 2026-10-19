import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { quotePriceSchema } from "@/lib/validations";
import { createRevolutOrder } from "@/lib/revolut";
import { sendEmail } from "@/lib/mail/resend";
import { QuoteReadyEmail } from "@/lib/mail/templates";
import { SERVICE_LABELS } from "@/lib/pricing";
import { z } from "zod";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid quote ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = quotePriceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid price" },
        { status: 400 }
      );
    }

    const db = requireDb();
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status === "paid" || quote.status === "cancelled") {
      return NextResponse.json(
        { error: "A paid or cancelled booking cannot be quoted again" },
        { status: 409 }
      );
    }

    const serviceLabel =
      SERVICE_LABELS[quote.serviceType as keyof typeof SERVICE_LABELS] ??
      quote.serviceType;

    const order = await createRevolutOrder({
      amountCents: parsed.data.priceCents,
      description: `${serviceLabel} - Custom Quote`,
      customerEmail: quote.email,
      quoteId: quote.id,
    });

    await db
      .update(quotes)
      .set({
        status: "quoted",
        priceCents: parsed.data.priceCents,
        revolutOrderId: order.id,
        checkoutUrl: order.checkout_url,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id));

    await sendEmail({
      to: quote.email,
      subject: `Your Goodycleaning Quote is Ready`,
      react: QuoteReadyEmail({
        name: quote.name,
        serviceType: serviceLabel,
        priceCents: parsed.data.priceCents,
        checkoutUrl: order.checkout_url,
      }),
    });

    return NextResponse.json({ success: true, checkoutUrl: order.checkout_url });
  } catch (error) {
    console.error("Send quote error:", error);
    return NextResponse.json(
      { error: "Failed to send quote" },
      { status: 500 }
    );
  }
}

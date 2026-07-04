import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { bookingSchema } from "@/lib/validations";
import { getPrice, isBigJob, SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { createRevolutOrder } from "@/lib/revolut";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (isBigJob(data.propertySize)) {
      return NextResponse.json(
        { error: "Large jobs require a quote request" },
        { status: 400 }
      );
    }

    const price = getPrice(data.serviceType, data.propertySize);
    if (!price) {
      return NextResponse.json(
        { error: "No price available for this combination" },
        { status: 400 }
      );
    }

    const db = requireDb();

    const [quote] = await db
      .insert(quotes)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        serviceType: data.serviceType,
        propertySize: data.propertySize,
        preferredDate: data.preferredDate
          ? new Date(data.preferredDate)
          : null,
        message: data.message,
        status: "quoted",
        priceCents: price,
      })
      .returning();

    const serviceLabel = SERVICE_LABELS[data.serviceType];
    const order = await createRevolutOrder({
      amountCents: price,
      description: `${serviceLabel} - ${PROPERTY_SIZE_LABELS[data.propertySize]}`,
      customerEmail: data.email,
      quoteId: quote.id,
    });

    await db
      .update(quotes)
      .set({
        revolutOrderId: order.id,
        checkoutUrl: order.checkout_url,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quote.id));

    return NextResponse.json({ checkoutUrl: order.checkout_url, quoteId: quote.id });
  } catch (error) {
    console.error("Instant checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

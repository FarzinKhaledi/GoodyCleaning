import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { bookingSchema } from "@/lib/validations";
import { sendEmail, adminEmail } from "@/lib/mail/resend";
import { AdminNewQuoteEmail } from "@/lib/mail/templates";
import { siteConfig } from "@/lib/config";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";

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
        status: "pending",
      })
      .returning();

    await sendEmail({
      to: adminEmail,
      subject: `New Quote Request from ${data.name}`,
      react: AdminNewQuoteEmail({
        quote: {
          id: quote.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          serviceType: SERVICE_LABELS[data.serviceType],
          propertySize: PROPERTY_SIZE_LABELS[data.propertySize],
          preferredDate: data.preferredDate,
          message: data.message,
        },
        adminUrl: `${siteConfig.url}/admin/quotes/${quote.id}`,
      }),
    });

    return NextResponse.json({ success: true, quoteId: quote.id });
  } catch (error) {
    console.error("Quote request error:", error);
    return NextResponse.json(
      { error: "Failed to submit quote request" },
      { status: 500 }
    );
  }
}

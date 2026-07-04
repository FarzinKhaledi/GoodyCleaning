import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes, bookings } from "@/lib/db/schema";
import { sendEmail, adminEmail } from "@/lib/mail/resend";
import {
  BookingConfirmationEmail,
  InternalPaymentAlertEmail,
} from "@/lib/mail/templates";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";

export async function completePayment(quoteId: string) {
  const db = requireDb();

  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote || quote.status === "paid") return quote;

  const amountCents = quote.priceCents ?? 0;

  await db
    .update(quotes)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  await db.insert(bookings).values({
    quoteId,
    amountCents,
    paidAt: new Date(),
    revolutOrderId: quote.revolutOrderId ?? `mock_${quoteId}`,
    confirmationSentAt: new Date(),
  });

  const serviceLabel =
    SERVICE_LABELS[quote.serviceType as keyof typeof SERVICE_LABELS] ??
    quote.serviceType;
  const propertyLabel =
    PROPERTY_SIZE_LABELS[
      quote.propertySize as keyof typeof PROPERTY_SIZE_LABELS
    ] ?? quote.propertySize;

  await sendEmail({
    to: quote.email,
    subject: "Booking Confirmed - Goodycleaning",
    react: BookingConfirmationEmail({
      name: quote.name,
      serviceType: serviceLabel,
      propertySize: propertyLabel,
      amountCents,
      preferredDate: quote.preferredDate
        ? formatDate(quote.preferredDate)
        : undefined,
    }),
  });

  await sendEmail({
    to: adminEmail,
    subject: `Payment Received - ${quote.name}`,
    react: InternalPaymentAlertEmail({
      customerName: quote.name,
      customerEmail: quote.email,
      serviceType: serviceLabel,
      amountCents,
      quoteId,
    }),
  });

  return quote;
}

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

// Call only after verifying an ORDER_COMPLETED webhook. Never trust a browser redirect.
export async function completePayment(revolutOrderId: string) {
  const db = requireDb();

  const payment = await db.transaction(async (tx) => {
    // Serialize duplicate deliveries and commit the booking with the paid status.
    const [quote] = await tx
      .select()
      .from(quotes)
      .where(eq(quotes.revolutOrderId, revolutOrderId))
      .limit(1)
      .for("update");

    if (
      !quote ||
      (quote.status !== "quoted" && quote.status !== "paid") ||
      !quote.priceCents ||
      quote.priceCents < 100
    ) return null;

    const [existingBooking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.quoteId, quote.id))
      .limit(1);

    const booking = existingBooking ?? (await tx.insert(bookings).values({
      quoteId: quote.id,
      amountCents: quote.priceCents,
      paidAt: new Date(),
      revolutOrderId,
    }).returning())[0];

    await tx
      .update(quotes)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(quotes.id, quote.id));

    return { quote, booking };
  });

  if (!payment) return null;
  const { quote, booking } = payment;
  if (booking.confirmationSentAt) return { ...quote, status: "paid" as const };

  const quoteId = quote.id;
  const amountCents = booking.amountCents;
  const serviceLabel =
    SERVICE_LABELS[quote.serviceType as keyof typeof SERVICE_LABELS] ??
    quote.serviceType;
  const propertyLabel =
    PROPERTY_SIZE_LABELS[
      quote.propertySize as keyof typeof PROPERTY_SIZE_LABELS
    ] ?? quote.propertySize;

  await sendEmail({
    to: quote.email,
    idempotencyKey: `booking-confirmation/${booking.id}`,
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
    idempotencyKey: `payment-alert/${booking.id}`,
    subject: `Payment Received - ${quote.name}`,
    react: InternalPaymentAlertEmail({
      customerName: quote.name,
      customerEmail: quote.email,
      serviceType: serviceLabel,
      amountCents,
      quoteId,
    }),
  });

  await db
    .update(bookings)
    .set({ confirmationSentAt: new Date() })
    .where(eq(bookings.id, booking.id));

  return { ...quote, status: "paid" as const };
}

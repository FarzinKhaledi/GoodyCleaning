import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes, bookings, type Quote } from "@/lib/db/schema";
import { sendBrandedEmail } from "@/lib/mail/enquiry";
import {
  buildCustomerPaymentAcknowledgementEmail,
  buildAdminPaymentEmail,
  type PaymentEmailInput,
} from "@/lib/mail/quote-templates";
import { SERVICE_LABELS, type ServiceType, type PropertySize } from "@/lib/pricing";
import { getRevolutOrder, RevolutError, type RevolutOrder } from "@/lib/revolut";

/** Match the verified provider result to the locked local quote, never browser data. */
export function verifyCompletedCleaningOrder(
  order: RevolutOrder,
  quote: Pick<Quote, "id" | "priceCents" | "revolutOrderId">,
) {
  if (order.id !== quote.revolutOrderId || order.state !== "completed" ||
    !Number.isSafeInteger(quote.priceCents) || (quote.priceCents ?? 0) < 100 ||
    order.amount !== quote.priceCents || order.currency !== "GBP" ||
    (order.outstanding_amount !== undefined && order.outstanding_amount !== 0) ||
    (order.refunded_amount !== undefined && order.refunded_amount !== 0) ||
    (order.metadata?.service && order.metadata.service !== "goodycleaning") ||
    (order.metadata?.cleaningQuoteId && order.metadata.cleaningQuoteId !== quote.id)) {
    throw new RevolutError("verification");
  }
}

function paymentEmailInput(quote: Quote, amountCents: number, paidAt: Date | null): PaymentEmailInput {
  const items = quote.lineItems?.length ? quote.lineItems : [{
    description: SERVICE_LABELS[quote.serviceType as ServiceType] ?? quote.serviceType,
    quantity: 1,
    unitPriceCents: amountCents,
  }];
  return {
    id: quote.id,
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    serviceType: quote.serviceType as ServiceType,
    propertySize: quote.propertySize as PropertySize,
    postcode: quote.postcode ?? undefined,
    preferredDate: quote.preferredDate?.toISOString().slice(0, 10),
    items,
    discountCents: quote.lineItems?.length ? quote.discountCents : 0,
    totalCents: amountCents,
    customerNotes: quote.customerNotes ?? undefined,
    paidAt: paidAt ?? undefined,
    paymentReference: quote.revolutOrderId ?? undefined,
  };
}

// Call only after verifying an ORDER_COMPLETED webhook. Never trust a browser redirect.
export async function completePayment(revolutOrderId: string) {
  const db = requireDb();
  const [matchedQuote] = await db.select().from(quotes)
    .where(eq(quotes.revolutOrderId, revolutOrderId)).limit(1);
  // The merchant account can send unrelated service events to this endpoint.
  // Ignore them without provider calls or side effects.
  if (!matchedQuote) return null;
  const providerOrder = await getRevolutOrder(revolutOrderId);

  const payment = await db.transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes)
      .where(eq(quotes.revolutOrderId, revolutOrderId)).limit(1).for("update");
    if (!quote || (quote.status !== "quoted" && quote.status !== "paid")) return null;
    verifyCompletedCleaningOrder(providerOrder, quote);

    const [existingBooking] = await tx.select().from(bookings)
      .where(eq(bookings.quoteId, quote.id)).limit(1);
    if (existingBooking && (existingBooking.revolutOrderId !== revolutOrderId ||
      existingBooking.amountCents !== quote.priceCents)) throw new RevolutError("verification");
    const booking = existingBooking ?? (await tx.insert(bookings).values({
      quoteId: quote.id,
      amountCents: quote.priceCents!,
      paidAt: new Date(),
      revolutOrderId,
    }).returning())[0];
    if (quote.status !== "paid") {
      await tx.update(quotes).set({ status: "paid", updatedAt: new Date() }).where(eq(quotes.id, quote.id));
    }
    return { quote, booking };
  });

  if (!payment) return null;
  const { quote, booking } = payment;
  if (booking.confirmationSentAt) return { ...quote, status: "paid" as const };
  const input = paymentEmailInput(quote, booking.amountCents, booking.paidAt);

  // Commit each delivery marker separately. A failed internal notification must
  // not resend the already-delivered customer email on the provider's retry.
  // Row locks serialize concurrent webhook deliveries. An accepted email followed
  // by a database commit failure remains ambiguous with Gmail's send-only API.
  for (const channel of ["customer", "admin"] as const) {
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookings)
        .where(eq(bookings.id, booking.id)).limit(1).for("update");
      if (!current || current.confirmationSentAt ||
        (channel === "customer" ? current.customerConfirmationSentAt : current.adminNotificationSentAt)) return;
      await sendBrandedEmail({
        to: channel === "customer" ? quote.email : "support@goodyvan.com",
        email: channel === "customer"
          ? buildCustomerPaymentAcknowledgementEmail(input)
          : buildAdminPaymentEmail(input),
      });
      const now = new Date();
      await tx.update(bookings).set({
        ...(channel === "customer" ? { customerConfirmationSentAt: now } : { adminNotificationSentAt: now }),
        ...((channel === "customer" ? current.adminNotificationSentAt : current.customerConfirmationSentAt)
          ? { confirmationSentAt: now } : {}),
      }).where(eq(bookings.id, booking.id));
    });
  }
  return { ...quote, status: "paid" as const };
}

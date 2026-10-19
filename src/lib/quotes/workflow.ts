import { eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes, type Quote } from "@/lib/db/schema";
import { sendBrandedEmail } from "@/lib/mail/enquiry";
import { buildCustomerQuoteEmail } from "@/lib/mail/quote-templates";
import { SERVICE_LABELS, type ServiceType, type PropertySize } from "@/lib/pricing";
import { createRevolutOrder, getRevolutOrder, cancelRevolutOrder, type RevolutOrder } from "@/lib/revolut";
import { calculateQuotePricing, getQuoteDiscount, quoteDraftSchema, type QuoteDraftInput, type QuoteLineItem } from "./pricing";

export class QuoteWorkflowError extends Error {
  constructor(public readonly status: number, message: string, public readonly quote?: Quote) {
    super(message);
    this.name = "QuoteWorkflowError";
  }
}

type Update = (changes: Partial<Quote>) => Promise<Quote>;
export interface QuoteWorkflowDependencies {
  withLockedQuote<T>(id: string, work: (quote: Quote, update: Update) => Promise<T>): Promise<T>;
  createOrder: typeof createRevolutOrder;
  getOrder: typeof getRevolutOrder;
  cancelOrder: typeof cancelRevolutOrder;
  send: typeof sendBrandedEmail;
}

const dependencies: QuoteWorkflowDependencies = {
  async withLockedQuote(id, work) {
    return requireDb().transaction(async (tx) => {
      const [quote] = await tx.select().from(quotes).where(eq(quotes.id, id)).limit(1).for("update");
      if (!quote) throw new QuoteWorkflowError(404, "Quote not found.");
      return work(quote, async (changes) => {
        const [updated] = await tx.update(quotes).set({ ...changes, updatedAt: new Date() })
          .where(eq(quotes.id, id)).returning();
        return updated;
      });
    });
  },
  createOrder: createRevolutOrder, getOrder: getRevolutOrder,
  cancelOrder: cancelRevolutOrder, send: sendBrandedEmail,
};

function assertEditable(quote: Quote, version: number) {
  if (quote.version !== version) throw new QuoteWorkflowError(409, "This quote has changed. Reload the latest version before continuing.");
  if (quote.status === "paid" || quote.status === "cancelled") {
    throw new QuoteWorkflowError(409, "A paid or cancelled quote cannot be changed or sent.");
  }
  if (quote.sendStartedAt && Date.now() - new Date(quote.sendStartedAt).getTime() < 120_000) {
    throw new QuoteWorkflowError(409, "This quote is being emailed. Please wait before trying again.");
  }
}

function itemsFor(quote: Quote): QuoteLineItem[] {
  return quote.lineItems.length ? quote.lineItems : [{
    description: SERVICE_LABELS[quote.serviceType as ServiceType] ?? quote.serviceType,
    quantity: 1, unitPriceCents: quote.priceCents ?? 0,
  }];
}

function assertPendingOrder(order: RevolutOrder, amount: number) {
  if (order.state !== "pending" || order.amount !== amount || order.currency !== "GBP" || !order.checkout_url) {
    throw new QuoteWorkflowError(409, "The payment link is no longer available for this quote. Refresh its payment status or reopen the draft.");
  }
}

export function createQuoteWorkflow(services: QuoteWorkflowDependencies) {
  return {
    async save(id: string, input: QuoteDraftInput) {
      const draft = quoteDraftSchema.parse(input);
      return services.withLockedQuote(id, async (quote, update) => {
        assertEditable(quote, draft.version);
        if (quote.status !== "pending") throw new QuoteWorkflowError(409, "Reopen the quote to cancel its payment link before editing.");
        const changes: Partial<Quote> = {};
        for (const field of ["name", "email", "phone", "serviceType", "propertySize"] as const) {
          const value = draft[field];
          if (value !== undefined) changes[field] = value;
        }
        if (draft.postcode !== undefined) changes.postcode = draft.postcode || null;
        if (draft.message !== undefined) changes.message = draft.message || null;
        if (draft.preferredDate !== undefined) {
          changes.preferredDate = draft.preferredDate ? new Date(`${draft.preferredDate}T12:00:00Z`) : null;
        }
        if (draft.customerNotes !== undefined) changes.customerNotes = draft.customerNotes || null;
        if (draft.internalNotes !== undefined) changes.internalNotes = draft.internalNotes || null;
        if ([draft.lineItems, draft.discountType, draft.discountCents, draft.discountBasisPoints].some((value) => value !== undefined)) {
          const discountType = draft.discountType ?? (draft.discountCents !== undefined ? "fixed" : quote.discountType ?? "fixed");
          const discount = getQuoteDiscount(discountType === "percentage"
            ? { discountType, discountBasisPoints: draft.discountBasisPoints ?? quote.discountBasisPoints }
            : { discountType, discountCents: draft.discountCents ?? (quote.discountType === "percentage" ? 0 : quote.discountCents) });
          const lineItems = draft.lineItems ?? quote.lineItems;
          let pricing: ReturnType<typeof calculateQuotePricing>;
          try { pricing = calculateQuotePricing(lineItems, discount); }
          catch { throw new QuoteWorkflowError(400, "Enter a valid discount and a quote total between £1 and £100,000."); }
          Object.assign(changes, { lineItems, discountType,
            discountBasisPoints: discount.discountType === "percentage" ? discount.discountBasisPoints : null,
            discountCents: pricing.discountCents, priceCents: pricing.totalCents });
        }
        return update({
          ...changes,
          sendStartedAt: null, version: quote.version + 1,
        });
      });
    },

    async send(id: string, version: number) {
      const prepared = await services.withLockedQuote(id, async (quote, update) => {
        assertEditable(quote, version);
        const items = itemsFor(quote);
        let total: number;
        let discountCents: number;
        try {
          const pricing = calculateQuotePricing(items, getQuoteDiscount(quote));
          total = pricing.totalCents;
          discountCents = pricing.discountCents;
        }
        catch { throw new QuoteWorkflowError(400, "Save a complete quote with a valid total before sending."); }
        let order: RevolutOrder;
        if (quote.revolutOrderId) {
          order = await services.getOrder(quote.revolutOrderId);
          if (quote.priceCents !== total) throw new QuoteWorkflowError(409, "The saved quote and payment amount differ. Reopen the draft to revise it.");
          assertPendingOrder(order, total);
        } else {
          order = await services.createOrder({
            amountCents: total,
            description: `GoodyCleaning · ${SERVICE_LABELS[quote.serviceType as ServiceType] ?? quote.serviceType}`,
            customerEmail: quote.email, quoteId: quote.id,
          });
          assertPendingOrder(order, total);
        }
        // Save the order before sending. Email retries must reuse this exact link.
        return update({ status: "quoted", priceCents: total, lineItems: items, discountCents,
          revolutOrderId: order.id, checkoutUrl: order.checkout_url, sendStartedAt: new Date() });
      });

      try {
        await services.send({
          to: prepared.email,
          email: buildCustomerQuoteEmail({
            id: prepared.id, name: prepared.name, email: prepared.email, phone: prepared.phone,
            serviceType: prepared.serviceType as ServiceType, propertySize: prepared.propertySize as PropertySize,
            postcode: prepared.postcode ?? undefined,
            preferredDate: prepared.preferredDate?.toISOString().slice(0, 10),
            items: prepared.lineItems, discountCents: prepared.discountCents,
            discountType: prepared.discountType, discountBasisPoints: prepared.discountBasisPoints,
            totalCents: prepared.priceCents!, customerNotes: prepared.customerNotes ?? undefined,
            checkoutUrl: prepared.checkoutUrl!,
          }),
        });
      } catch {
        const saved = await services.withLockedQuote(id, async (_quote, update) => update({ sendStartedAt: null }));
        throw new QuoteWorkflowError(502, "The payment link is saved, but the email could not be sent. Retry sending to reuse the same link.", saved);
      }
      const saved = await services.withLockedQuote(id, async (quote, update) => update({
        quoteEmailSentAt: new Date(), sendStartedAt: null, version: quote.version + 1,
      }));
      return { success: true, checkoutUrl: saved.checkoutUrl, quote: saved };
    },

    async reopen(id: string, version: number) {
      return services.withLockedQuote(id, async (quote, update) => {
        assertEditable(quote, version);
        if (quote.status !== "quoted") throw new QuoteWorkflowError(409, "Only an unpaid issued quote can be reopened.");
        if (quote.revolutOrderId) {
          // A processing or completed order cannot be cancelled or silently replaced.
          await services.cancelOrder(quote.revolutOrderId);
        }
        return update({ status: "pending", revolutOrderId: null, checkoutUrl: null,
          quoteEmailSentAt: null, sendStartedAt: null, version: quote.version + 1 });
      });
    },
  };
}

export const quoteWorkflow = createQuoteWorkflow(dependencies);

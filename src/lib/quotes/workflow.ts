import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "@/lib/db";
import { quotes, type Quote } from "@/lib/db/schema";
import { sendBrandedEmail } from "@/lib/mail/enquiry";
import { buildCustomerQuoteEmail } from "@/lib/mail/quote-templates";
import { SERVICE_LABELS, type ServiceType, type PropertySize } from "@/lib/pricing";
import { createRevolutOrder, getRevolutOrder, cancelRevolutOrder, type RevolutOrder } from "@/lib/revolut";
import { calculateQuoteTotal, quoteDraftSchema, type QuoteLineItem } from "./pricing";

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
    async save(id: string, input: z.infer<typeof quoteDraftSchema>) {
      const draft = quoteDraftSchema.parse(input);
      return services.withLockedQuote(id, async (quote, update) => {
        assertEditable(quote, draft.version);
        if (quote.status !== "pending") throw new QuoteWorkflowError(409, "Reopen the quote to cancel its payment link before editing.");
        return update({
          lineItems: draft.lineItems, discountCents: draft.discountCents,
          priceCents: calculateQuoteTotal(draft.lineItems, draft.discountCents),
          customerNotes: draft.customerNotes || null, internalNotes: draft.internalNotes || null,
          sendStartedAt: null, version: quote.version + 1,
        });
      });
    },

    async send(id: string, version: number) {
      const prepared = await services.withLockedQuote(id, async (quote, update) => {
        assertEditable(quote, version);
        const items = itemsFor(quote);
        let total: number;
        try { total = calculateQuoteTotal(items, quote.discountCents); }
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
        return update({ status: "quoted", priceCents: total, lineItems: items,
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

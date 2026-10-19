import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Quote } from "@/lib/db/schema";
import { SERVICE_LABELS, type PropertySize, type ServiceType } from "@/lib/pricing";
import { calculateQuotePricing, getQuoteDiscount } from "@/lib/quotes/pricing";
import { buildCustomerQuoteEmail } from "./quote-templates";
import { SUPPORT_ADDRESS } from "./enquiry";

/** Only customer-facing saved fields may be passed into the email renderer. */
export type SavedQuotePreview = Pick<Quote,
  "id" | "name" | "email" | "phone" | "serviceType" | "propertySize" |
  "postcode" | "preferredDate" | "lineItems" | "discountCents" |
  "priceCents" | "customerNotes" | "checkoutUrl" | "version"
> & {
  discountType?: "fixed" | "percentage";
  discountBasisPoints?: number | null;
};

export interface CustomerQuotePreview {
  subject: string;
  html: string;
  to: string;
  from: string;
  replyTo: string;
  version: number;
}

/**
 * Render the actual outgoing template with the same saved values as Send.
 * No transport, quote mutation, or Revolut order is invoked by a preview.
 */
export async function buildCustomerQuotePreview(quote: SavedQuotePreview): Promise<CustomerQuotePreview> {
  const items = quote.lineItems.length ? quote.lineItems : [{
    description: SERVICE_LABELS[quote.serviceType as ServiceType] ?? quote.serviceType,
    quantity: 1,
    unitPriceCents: quote.priceCents ?? 0,
  }];
  const { totalCents, discountCents } = calculateQuotePricing(items, getQuoteDiscount(quote));
  const email = buildCustomerQuoteEmail({
    id: quote.id,
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    serviceType: quote.serviceType as ServiceType,
    propertySize: quote.propertySize as PropertySize,
    postcode: quote.postcode ?? undefined,
    preferredDate: quote.preferredDate?.toISOString().slice(0, 10),
    items,
    discountCents,
    discountType: quote.discountType,
    discountBasisPoints: quote.discountBasisPoints,
    totalCents,
    customerNotes: quote.customerNotes ?? undefined,
    // A draft has no order yet. This controlled URL is removed from preview HTML below.
    checkoutUrl: quote.checkoutUrl || "https://goodycleaning.co.uk/#email-preview",
  });

  // Use the identical PNG attachment served by the Gmail transport, with no remote request.
  const logo = await readFile(join(process.cwd(), "src/lib/mail/assets/goodycleaning-logo.png"));
  let html = email.html.replace('src="cid:goodycleaning-logo"', `src="data:image/png;base64,${logo.toString("base64")}"`);
  // The preview is visual-only, even when a saved quote has a real payment link.
  html = html.replace(/\bhref=("[^"]*"|'[^']*')/gi, 'aria-disabled="true" role="link" tabindex="-1"');
  html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none';" />`);

  return {
    subject: email.subject,
    html,
    to: quote.email,
    from: `GoodyCleaning <${SUPPORT_ADDRESS}>`,
    replyTo: SUPPORT_ADDRESS,
    version: quote.version,
  };
}

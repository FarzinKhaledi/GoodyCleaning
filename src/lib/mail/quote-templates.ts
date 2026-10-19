import { siteConfig } from "@/lib/config";
import { PROPERTY_SIZE_LABELS, SERVICE_LABELS, type PropertySize, type ServiceType } from "@/lib/pricing";
import {
  button, colours, escapeHtml, escapeMultiline, font, layout, preferredDate,
  singleLine, summaryTable, supportEmail, supportPhone,
  type EnquiryEmailContent, type SummaryRow,
} from "./enquiry-templates";

export interface QuoteEmailItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface QuoteEmailDetails {
  id: string;
  reference?: string;
  name: string;
  email: string;
  phone: string;
  serviceType: ServiceType;
  propertySize: PropertySize;
  postcode?: string;
  preferredDate?: string;
  items: QuoteEmailItem[];
  discountCents: number;
  discountType?: "fixed" | "percentage";
  /** The saved percentage in hundredths of one percent (1000 = 10%). */
  discountBasisPoints?: number | null;
  totalCents: number;
  customerNotes?: string;
}

export interface QuoteEmailInput extends QuoteEmailDetails {
  checkoutUrl: string;
}

export interface PaymentEmailInput extends QuoteEmailDetails {
  checkoutUrl?: string;
  paidAt?: Date | string;
  paymentReference?: string;
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const paragraph = `font-family:${font};font-size:15px;line-height:25px;color:${colours.muted};`;
const dateNote = "Your cleaning date and access arrangements will be agreed with our team. Payment does not confirm an unagreed date.";

function money(cents: number) {
  return gbp.format(cents / 100);
}

function reference(quote: QuoteEmailDetails) {
  return singleLine(quote.reference || `GC-${quote.id.slice(0, 8).toUpperCase()}`);
}

function assertAmounts(quote: QuoteEmailDetails) {
  if (!quote.items.length || quote.items.some((item) =>
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
    !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0 ||
    !Number.isSafeInteger(item.quantity * item.unitPriceCents),
  )) throw new Error("Invalid quote amounts");
  const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(quote.discountCents) ||
    quote.discountCents < 0 || quote.discountCents > subtotal ||
    !Number.isSafeInteger(quote.totalCents) || quote.totalCents !== subtotal - quote.discountCents) {
    throw new Error("Invalid quote amounts");
  }
  if (quote.discountType === "percentage" &&
    (!Number.isInteger(quote.discountBasisPoints) || quote.discountBasisPoints! < 0 || quote.discountBasisPoints! > 10_000 ||
      Math.round(subtotal * quote.discountBasisPoints! / 10_000) !== quote.discountCents)) {
    throw new Error("Invalid quote percentage");
  }
  return subtotal;
}

function discountLabel(quote: QuoteEmailDetails) {
  if (quote.discountType !== "percentage") return "Discount";
  const basisPoints = quote.discountBasisPoints;
  if (!Number.isInteger(basisPoints) || basisPoints! < 0 || basisPoints! > 10_000) {
    throw new Error("Invalid quote percentage");
  }
  const percent = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(basisPoints! / 100);
  return `Discount (${percent}%)`;
}

function checkoutLink(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid payment link");
  return url.toString();
}

function detailRows(quote: QuoteEmailDetails): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: "Quote reference", value: reference(quote) },
    { label: "Service", value: SERVICE_LABELS[quote.serviceType] },
    { label: "Property size", value: PROPERTY_SIZE_LABELS[quote.propertySize] },
  ];
  if (quote.postcode) rows.push({ label: "Postcode", value: singleLine(quote.postcode) });
  const date = preferredDate(quote.preferredDate);
  if (date) rows.push({ label: "Preferred date", value: `${date} (to be agreed)` });
  return rows;
}

function detailPanel(rows: SummaryRow[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.offwhite}" style="width:100%;border-collapse:separate;background-color:${colours.offwhite};border:1px solid ${colours.border};border-radius:14px;"><tr><td style="padding:5px 18px;">${summaryTable(rows)}</td></tr></table>`;
}

function itemTable(quote: QuoteEmailDetails, subtotal: number) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:${font};">
    <thead><tr><th align="left" width="74%" style="padding:13px 10px 13px 0;border-bottom:1px solid ${colours.border};font-size:12px;line-height:18px;color:${colours.muted};font-weight:600;">Cleaning details</th><th align="right" width="26%" style="padding:13px 0;border-bottom:1px solid ${colours.border};font-size:12px;line-height:18px;color:${colours.muted};font-weight:600;">Amount</th></tr></thead>
    <tbody>${quote.items.map((item) => `<tr><td valign="top" style="padding:14px 10px 14px 0;border-bottom:1px solid ${colours.border};font-size:14px;line-height:21px;color:${colours.navy};word-break:break-word;overflow-wrap:anywhere;">${escapeMultiline(item.description)}<br /><span style="font-size:12px;line-height:20px;color:${colours.muted};">${item.quantity} &times; ${money(item.unitPriceCents)}</span></td><td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid ${colours.border};font-size:14px;line-height:21px;color:${colours.navy};font-weight:600;white-space:nowrap;">${money(item.quantity * item.unitPriceCents)}</td></tr>`).join("")}</tbody>
    <tfoot>${quote.discountCents ? `<tr><td style="padding:14px 10px 5px 0;font-size:13px;line-height:20px;color:${colours.muted};">Subtotal</td><td align="right" style="padding:14px 0 5px;font-size:13px;line-height:20px;color:${colours.navy};white-space:nowrap;">${money(subtotal)}</td></tr><tr><td style="padding:5px 10px 12px 0;font-size:13px;line-height:20px;color:#267338;">${escapeHtml(discountLabel(quote))}</td><td align="right" style="padding:5px 0 12px;font-size:13px;line-height:20px;color:#267338;font-weight:600;white-space:nowrap;">&minus;${money(quote.discountCents)}</td></tr>` : ""}<tr><td style="padding:17px 10px 17px 0;border-top:2px solid ${colours.navy};font-size:16px;line-height:24px;font-weight:700;color:${colours.navy};">Total (GBP)</td><td align="right" style="padding:17px 0;border-top:2px solid ${colours.navy};font-size:23px;line-height:28px;font-weight:700;color:${colours.blue};white-space:nowrap;">${money(quote.totalCents)}</td></tr></tfoot>
  </table>`;
}

function notes(quote: QuoteEmailDetails) {
  if (!quote.customerNotes?.trim()) return "";
  return `<h2 style="margin:22px 0 8px;font-family:${font};font-size:15px;line-height:23px;color:${colours.navy};">Included in your quote</h2><p style="margin:0 0 20px;${paragraph}font-size:14px;word-break:break-word;overflow-wrap:anywhere;">${escapeMultiline(quote.customerNotes.trim())}</p>`;
}

function textBreakdown(quote: QuoteEmailDetails, subtotal: number) {
  return [
    ...quote.items.map((item) => `${singleLine(item.description)}: ${item.quantity} x ${money(item.unitPriceCents)} = ${money(item.quantity * item.unitPriceCents)}`),
    ...(quote.discountCents ? [`Subtotal: ${money(subtotal)}`, `${discountLabel(quote)}: -${money(quote.discountCents)}`] : []),
    `Total (GBP): ${money(quote.totalCents)}`,
    ...(quote.customerNotes?.trim() ? ["", "Included in your quote:", quote.customerNotes.trim()] : []),
  ];
}

export function buildCustomerQuoteEmail(quote: QuoteEmailInput): EnquiryEmailContent {
  const subtotal = assertAmounts(quote);
  // Validate percentage metadata even when a very small discount rounds to zero.
  if (quote.discountType === "percentage") discountLabel(quote);
  const checkoutUrl = checkoutLink(quote.checkoutUrl);
  const rows = detailRows(quote);
  const subject = `Your GoodyCleaning quote · ${reference(quote)}`;
  const html = layout({
    preview: `Your tailored cleaning quote is ready. Total: ${money(quote.totalCents)}.`,
    eyebrow: `Your tailored quote · ${reference(quote)}`,
    heading: "Your cleaning quote is ready.",
    content: `<p style="margin:0 0 14px;font-family:${font};font-size:16px;line-height:26px;font-weight:600;color:${colours.navy};">Hi ${escapeHtml(singleLine(quote.name))},</p>
      <p style="margin:0 0 24px;${paragraph}">Thank you for choosing GoodyCleaning. We&apos;ve reviewed your enquiry and prepared the quote below for your space.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.navy}" style="width:100%;border-collapse:separate;background-color:${colours.navy};border-radius:16px;margin:0 0 26px;">
        <tr><td class="email-quote-hero" style="padding:25px 24px;">
          <p style="margin:0 0 9px;font-family:${font};font-size:11px;line-height:18px;font-weight:700;letter-spacing:1.2px;color:#c9d8e3;text-transform:uppercase;">Your quote total</p>
          <p style="margin:0 0 8px;font-family:${font};font-size:42px;line-height:48px;font-weight:700;letter-spacing:-1.5px;color:#ffffff;">${money(quote.totalCents)}</p>
          <p style="margin:0;font-family:${font};font-size:14px;line-height:22px;color:#e3ecf3;">${escapeHtml(SERVICE_LABELS[quote.serviceType])} &middot; ${escapeHtml(PROPERTY_SIZE_LABELS[quote.propertySize])}</p>
          ${quote.discountCents ? `<p style="margin:17px 0 0;padding:12px 0 0;border-top:1px solid #345065;font-family:${font};font-size:13px;line-height:21px;color:${colours.lime};font-weight:600;">You save ${money(quote.discountCents)}${quote.discountType === "percentage" ? ` with your ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(quote.discountBasisPoints! / 100)}% discount` : " on this quote"}.</p>` : ""}
        </td></tr>
      </table>
      <h2 style="margin:0 0 10px;font-family:${font};font-size:16px;line-height:24px;font-weight:700;color:${colours.navy};">Prepared for you</h2>
      ${detailPanel([
        { label: "Customer", value: singleLine(quote.name) },
        { label: "Email", value: singleLine(quote.email) },
        { label: "Phone", value: singleLine(quote.phone) },
      ])}
      <h2 style="margin:25px 0 10px;font-family:${font};font-size:16px;line-height:24px;font-weight:700;color:${colours.navy};">Your cleaning details</h2>
      ${detailPanel(rows)}
      <h2 style="margin:25px 0 0;font-family:${font};font-size:16px;line-height:24px;font-weight:700;color:${colours.navy};">A clear breakdown</h2>
      ${itemTable(quote, subtotal)}
      ${notes(quote)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.offwhite}" style="width:100%;border-collapse:separate;background-color:${colours.offwhite};border:1px solid ${colours.border};border-radius:14px;margin:12px 0 24px;">
        <tr><td style="padding:22px 20px;">
          <h2 style="margin:0 0 9px;font-family:${font};font-size:17px;line-height:25px;font-weight:700;color:${colours.navy};">Ready for a fresher space?</h2>
          <p style="margin:0 0 17px;${paragraph}font-size:14px;">Review your details, then pay ${money(quote.totalCents)} through our secure Revolut checkout.</p>
          ${button("Pay securely with Revolut", checkoutUrl)}
          <p style="margin:13px 0 0;font-family:${font};font-size:11px;line-height:18px;color:${colours.muted};">Secure payment &middot; Payment acknowledgement sent by email</p>
        </td></tr>
      </table>
      <h2 style="margin:0 0 8px;font-family:${font};font-size:16px;line-height:24px;font-weight:700;color:${colours.navy};">What happens next?</h2>
      <p style="margin:0 0 18px;${paragraph}font-size:14px;">Once payment is received, we&apos;ll send you an acknowledgement and contact you to agree your cleaning date and access arrangements.</p>
      <p style="margin:0 0 18px;padding:13px 16px;border-left:3px solid ${colours.lime};background-color:${colours.offwhite};font-family:${font};font-size:12px;line-height:21px;color:${colours.muted};">${escapeHtml(dateNote)}</p>
      <p style="margin:0;${paragraph}font-size:14px;">Need to adjust anything? Reply to this email or call <a href="tel:${supportPhone.replace(/\s/g, "")}" style="color:${colours.blue};text-decoration:underline;">${escapeHtml(supportPhone)}</a>. We&apos;ll be happy to help.</p>`,
    footer: "This quote was prepared by the GoodyCleaning team in response to your cleaning enquiry.",
  });
  const text = [
    "GOODYCLEANING", "Your cleaning quote is ready.", "", `Hi ${singleLine(quote.name)},`, "",
    "Thank you for choosing GoodyCleaning. We've reviewed your enquiry and prepared the quote below for your space.", "",
    `Customer: ${singleLine(quote.name)}`, `Email: ${singleLine(quote.email)}`, `Phone: ${singleLine(quote.phone)}`, "",
    ...rows.map(({ label, value }) => `${label}: ${value}`), "", ...textBreakdown(quote, subtotal), "",
    "Pay securely with Revolut:", checkoutUrl, "", dateNote, "",
    `Need to adjust anything? Reply to this email or contact ${supportEmail}.`, `Call ${supportPhone}.`, "", "GoodyCleaning",
  ].join("\n");
  return { subject, html, text };
}

function receivedAt(value: PaymentEmailInput["paidAt"]) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

export function buildCustomerPaymentAcknowledgementEmail(payment: PaymentEmailInput): EnquiryEmailContent {
  const subtotal = assertAmounts(payment);
  const rows = detailRows(payment);
  const date = receivedAt(payment.paidAt);
  if (date) rows.push({ label: "Payment received", value: date });
  const subject = `Payment received · GoodyCleaning ${reference(payment)}`;
  const html = layout({
    preview: `We've received your payment of ${money(payment.totalCents)}. Thank you.`,
    eyebrow: "Thank you for your payment",
    heading: "Payment received. Thank you.",
    content: `<p style="margin:0 0 14px;font-family:${font};font-size:16px;line-height:26px;font-weight:600;color:${colours.navy};">Hi ${escapeHtml(singleLine(payment.name))},</p>
      <p style="margin:0 0 24px;${paragraph}">We&apos;ve received your payment of <strong style="color:${colours.navy};">${money(payment.totalCents)}</strong> for your GoodyCleaning quote. Our team will be in touch about the cleaning details and next steps.</p>
      ${detailPanel(rows)}${itemTable(payment, subtotal)}${notes(payment)}
      <p style="margin:14px 0 18px;font-family:${font};font-size:12px;line-height:21px;color:${colours.muted};">${escapeHtml(dateNote)}</p>
      <p style="margin:0;${paragraph}font-size:14px;">Have a question? Reply to this email and our team will help.</p>`,
    footer: "Keep this email for your records. Please contact us if any details need correcting.",
  });
  const text = [
    "GOODYCLEANING", "Payment received. Thank you.", "", `Hi ${singleLine(payment.name)},`, "",
    `We've received your payment of ${money(payment.totalCents)} for your GoodyCleaning quote. Our team will be in touch about the cleaning details and next steps.`, "",
    ...rows.map(({ label, value }) => `${label}: ${value}`), "", ...textBreakdown(payment, subtotal), "", dateNote, "",
    `Have a question? Reply to this email or contact ${supportEmail}.`, `Call ${supportPhone}.`, "", "Keep this email for your records.",
  ].join("\n");
  return { subject, html, text };
}

export function buildAdminPaymentEmail(payment: PaymentEmailInput): EnquiryEmailContent {
  const subtotal = assertAmounts(payment);
  const rows: SummaryRow[] = [
    { label: "Customer", value: payment.name },
    { label: "Email", value: payment.email },
    { label: "Phone", value: payment.phone },
    ...detailRows(payment),
  ];
  const date = receivedAt(payment.paidAt);
  if (date) rows.push({ label: "Payment received", value: date });
  if (payment.paymentReference) rows.push({ label: "Payment reference", value: payment.paymentReference });
  const reviewUrl = `${siteConfig.url}/admin/quotes/${encodeURIComponent(payment.id)}`;
  const subject = `Payment received · GoodyCleaning ${reference(payment)}`;
  return {
    subject,
    html: layout({
      preview: `Payment of ${money(payment.totalCents)} has been received. Review the quote and arrange the clean.`,
      eyebrow: "Cleaning payment received",
      heading: "A customer has paid their quote.",
      content: `<p style="margin:0 0 24px;${paragraph}">Payment of <strong style="color:${colours.navy};">${money(payment.totalCents)}</strong> has been received. Review the details below and contact the customer to arrange the clean.</p>${detailPanel(rows)}${itemTable(payment, subtotal)}${notes(payment)}
        <div style="margin:20px 0 0;">${button("Review paid quote", reviewUrl)}</div>
        <p style="margin:18px 0 0;font-family:${font};font-size:12px;line-height:21px;color:${colours.muted};">Agree the cleaning date and access arrangements with the customer.</p>`,
      footer: "GoodyCleaning · Internal payment notification",
    }),
    text: [
      "GOODYCLEANING", "Cleaning payment received", "", `Payment received: ${money(payment.totalCents)}`, "",
      ...rows.map(({ label, value }) => `${label}: ${value}`), "", ...textBreakdown(payment, subtotal), "",
      `Review paid quote: ${reviewUrl}`, "", "Contact the customer to agree the cleaning date and access arrangements.", "",
      "GoodyCleaning · Internal payment notification", `${supportEmail} | ${supportPhone}`,
    ].join("\n"),
  };
}

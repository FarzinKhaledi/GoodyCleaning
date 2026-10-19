import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { buildAdminEnquiryEmail } from "../src/lib/mail/enquiry-templates";
import { EnquiryDeliveryError, sendBrandedEmail, sendEnquiryEmail } from "../src/lib/mail/enquiry";
import {
  buildAdminPaymentEmail, buildCustomerPaymentAcknowledgementEmail, buildCustomerQuoteEmail,
  type QuoteEmailInput,
} from "../src/lib/mail/quote-templates";

const quote: QuoteEmailInput = {
  id: "12345678-1234-1234-1234-123456789012",
  name: "Alex & Co",
  email: "alex@example.com",
  phone: "07700900123",
  serviceType: "deep",
  propertySize: "2bed",
  postcode: "SW1A 1AA",
  preferredDate: "2099-01-01",
  items: [
    { description: "Deep cleaning", quantity: 1, unitPriceCents: 15000 },
    { description: "Additional carpet", quantity: 2, unitPriceCents: 2500 },
  ],
  discountCents: 2000,
  totalCents: 18000,
  customerNotes: "Kitchen and bathroom included.\nWe'll agree access with you.",
  checkoutUrl: "https://checkout.revolut.com/pay/test-order?token=example&source=quote",
};
const envKeys = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER", "GMAIL_USER"] as const;
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  Object.assign(process.env, {
    GMAIL_CLIENT_ID: "test-client-id",
    GMAIL_CLIENT_SECRET: "test-client-secret",
    GMAIL_REFRESH_TOKEN: "test-refresh-token",
    GMAIL_SENDER: "support@goodyvan.com",
    GMAIL_USER: "support@goodyvan.com",
  });
});
after(() => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

test("quote email contains the exact itemised GBP total, discount, and secure payment link", () => {
  const email = buildCustomerQuoteEmail(quote);
  for (const value of ["GC-12345678", "Deep Cleaning", "2 Bedrooms", "1 January 2099", "£150.00", "2 x £25.00 = £50.00", "Discount: -£20.00", "Total (GBP): £180.00", quote.checkoutUrl]) {
    assert.ok(email.text.includes(value), value);
  }
  assert.match(email.html, /src="cid:goodycleaning-logo"/);
  assert.match(email.html, /Pay securely with Revolut/);
  assert.match(email.html, /token=example&amp;source=quote/);
  assert.ok(!email.text.includes("confirmed booking"));
  assert.match(email.text, /Payment does not confirm an unagreed date/);
});

test("quote emails escape admin-editable fields and reject unusable totals or payment URLs", () => {
  const email = buildCustomerQuoteEmail({
    ...quote,
    name: '<Alex "test">',
    items: [{ description: "<script>alert('x')</script>\nSecond line", quantity: 1, unitPriceCents: 18000 }],
    discountCents: 0,
    customerNotes: '<img src=x onerror="alert(1)">',
  });
  assert.match(email.html, /&lt;Alex &quot;test&quot;&gt;/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.html, /&lt;img src=x/);
  assert.ok(!email.html.includes("<script>"));
  assert.ok(!email.html.includes("<img src=x"));
  for (const change of [
    { totalCents: 17999 }, { discountCents: -1 }, { totalCents: Number.NaN },
    { items: [] }, { items: [{ description: "test", quantity: 0, unitPriceCents: 18000 }] },
    { items: [{ description: "test", quantity: 1, unitPriceCents: 18000.5 }] },
    { checkoutUrl: "javascript:alert(1)" }, { checkoutUrl: "http://checkout.revolut.com/pay/test" },
    { checkoutUrl: "https://user:password@checkout.revolut.com/pay/test" },
  ]) assert.throws(() => buildCustomerQuoteEmail({ ...quote, ...change }));
});

test("customer payment email acknowledges received payment while admin receives contact and review details", () => {
  const payment = { ...quote, paymentReference: "revolut-order-123", paidAt: "2026-10-19T12:00:00Z" };
  const customer = buildCustomerPaymentAcknowledgementEmail(payment);
  const admin = buildAdminPaymentEmail(payment);
  assert.match(customer.text, /We've received your payment of £180\.00/);
  assert.match(customer.text, /19 October 2026/);
  assert.match(customer.text, /13:00 BST/);
  assert.match(customer.text, /date and access arrangements will be agreed/);
  assert.ok(!customer.text.includes(quote.checkoutUrl));
  assert.ok(!customer.html.includes("Pay securely"));
  assert.ok(!customer.text.includes("revolut-order-123"));
  for (const value of [quote.email, quote.phone, "revolut-order-123", `/admin/quotes/${quote.id}`]) {
    assert.ok(admin.text.includes(value), value);
  }
});

test("internal enquiry email includes dashboard review link only when its quote is persisted", () => {
  const enquiry = { ...quote, website: "", message: "Please discuss my quote." };
  const withQuote = buildAdminEnquiryEmail(enquiry, { quoteId: quote.id });
  assert.match(withQuote.html, /Review enquiry &amp; prepare quote/);
  assert.ok(withQuote.text.includes(`/admin/quotes/${quote.id}`));
  const legacy = buildAdminEnquiryEmail(enquiry);
  assert.ok(!legacy.text.includes("/admin/quotes/"));
  assert.match(legacy.html, /Reply to customer/);
});

test("generic branded Gmail transport uses verified support sender, safe MIME, logo and returns provider ID", async (t) => {
  const calls: { url: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(init?.cache, "no-store");
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "test-access-token" });
    assert.equal(url, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    return Response.json({ id: "provider-message-123" });
  });
  assert.deepEqual(await sendBrandedEmail({ to: quote.email, email: buildCustomerQuoteEmail(quote) }), { id: "provider-message-123" });
  assert.equal(calls.length, 2);
  const { raw } = JSON.parse(String(calls[1].init?.body));
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  const headers = mime.split("\r\n\r\n")[0];
  assert.match(headers, /From: GoodyCleaning <support@goodyvan.com>/);
  assert.match(headers, /To: alex@example.com/);
  assert.match(headers, /Reply-To: support@goodyvan.com/);
  assert.match(mime, /Content-ID: <goodycleaning-logo>/);
  const count = calls.length;
  await assert.rejects(sendBrandedEmail({ to: "alex@example.com\r\nBcc: attacker@example.com", email: buildCustomerQuoteEmail(quote) }), EnquiryDeliveryError);
  await assert.rejects(sendBrandedEmail({ to: quote.email, replyTo: "bad-address", email: buildCustomerQuoteEmail(quote) }), EnquiryDeliveryError);
  assert.equal(calls.length, count, "Invalid addresses fail before any provider call");
});

test("enquiry transport retains one token refresh and two deliveries while adding admin review link", async (t) => {
  const calls: { url: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "test-access-token" });
    assert.equal(url, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    return Response.json({ id: "provider-message-123" });
  });
  const result = await sendEnquiryEmail({ ...quote, message: "Please discuss access.", website: "" }, { quoteId: quote.id });
  assert.deepEqual(result, { acknowledgementSent: true });
  assert.equal(calls.length, 3);
  const { raw } = JSON.parse(String(calls[1].init?.body));
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  const textPart = mime.match(/Content-Type: text\/plain;[^\r\n]*\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)(?=\r\n--)/)?.[1];
  assert.ok(textPart);
  assert.ok(Buffer.from(textPart, "base64").toString("utf8").includes(`/admin/quotes/${quote.id}`));
});

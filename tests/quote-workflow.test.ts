import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Quote } from "../src/lib/db/schema";
import type { RevolutOrder } from "../src/lib/revolut";
import { calculateQuotePricing, calculateQuoteTotal, quoteCustomerDetailsSchema, quoteDraftSchema } from "../src/lib/quotes/pricing";
import { createQuoteWorkflow, QuoteWorkflowError, type QuoteWorkflowDependencies } from "../src/lib/quotes/workflow";

const id = "12345678-1234-1234-1234-123456789012";
const orderId = "87654321-4321-4321-4321-210987654321";
const item = { description: "Deep cleaning", quantity: 2, unitPriceCents: 7500 };
const order: RevolutOrder = {
  id: orderId, token: "test-checkout-token", state: "pending", currency: "GBP", amount: 14000,
  checkout_url: "https://checkout.revolut.com/payment-link/test-order",
};
const initialQuote: Quote = {
  id, name: "Alex Smith", email: "alex@example.com", phone: "07700900123",
  serviceType: "deep", propertySize: "2bed", postcode: "SW1A 1AA",
  preferredDate: new Date("2099-01-01T12:00:00Z"), message: "Customer enquiry message, not agreed scope.",
  status: "pending", priceCents: 14000, revolutOrderId: null, checkoutUrl: null,
  lineItems: [item], discountCents: 1000, discountType: "fixed", discountBasisPoints: null,
  customerNotes: "Kitchen and bathroom included.",
  internalNotes: "PRIVATE: cleaner cost £60, internal margin target 40%.",
  version: 0, quoteEmailSentAt: null, sendStartedAt: null,
  createdAt: new Date("2026-10-19T12:00:00Z"), updatedAt: new Date("2026-10-19T12:00:00Z"),
};

function fixture(changes: Partial<Quote> = {}, overrides: Partial<QuoteWorkflowDependencies> = {}) {
  let state = structuredClone({ ...initialQuote, ...changes });
  let queue = Promise.resolve();
  const events: string[] = [];
  const created: Parameters<QuoteWorkflowDependencies["createOrder"]>[0][] = [];
  const sent: Parameters<QuoteWorkflowDependencies["send"]>[0][] = [];
  const fetched: string[] = [];
  const cancelled: string[] = [];
  const withLockedQuote: QuoteWorkflowDependencies["withLockedQuote"] = (quoteId, work) => {
    const task = queue.then(async () => {
      assert.equal(quoteId, id);
      let working = structuredClone(state);
      const result = await work(structuredClone(working), async (updates) => {
        working = { ...working, ...structuredClone(updates) };
        events.push("update");
        return structuredClone(working);
      });
      // Match a database transaction: changes commit only when the callback succeeds.
      state = working;
      return result;
    });
    queue = task.then(() => undefined, () => undefined);
    return task;
  };
  const services: QuoteWorkflowDependencies = {
    withLockedQuote,
    createOrder: async (input) => {
      created.push(structuredClone(input)); events.push("create");
      return structuredClone({ ...order, amount: input.amountCents });
    },
    getOrder: async (value) => {
      fetched.push(value); events.push("get");
      return structuredClone(order);
    },
    cancelOrder: async (value) => {
      cancelled.push(value); events.push("cancel");
      return structuredClone({ ...order, state: "cancelled" });
    },
    send: async (input) => {
      sent.push(structuredClone(input)); events.push("send");
      return { id: "test-message-id" };
    },
    ...overrides,
  };
  return { workflow: createQuoteWorkflow(services), current: () => structuredClone(state), events, created, sent, fetched, cancelled };
}

beforeEach(() => {
  // All payment and mail dependencies are injected; an accidental real request fails.
  mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected real provider request"); });
});
afterEach(() => mock.restoreAll());

function conflict(error: unknown) {
  assert.ok(error instanceof QuoteWorkflowError);
  assert.equal(error.status, 409);
  return true;
}

test("quote pricing calculates whole pence exactly and rejects invalid or unpayable totals", () => {
  assert.equal(calculateQuoteTotal([{ description: "Small clean", quantity: 3, unitPriceCents: 333 }], 99), 900);
  assert.equal(calculateQuoteTotal([item], 1000), 14000);
  for (const [items, discount] of [
    [[], 0], [[{ ...item, quantity: 1.5 }], 0], [[{ ...item, unitPriceCents: 99.5 }], 0],
    [[item], -1], [[item], 0.5], [[item], 15000], [[item], 14901],
    [[{ ...item, quantity: 100, unitPriceCents: 10000000 }], 0],
  ] as const) assert.throws(() => calculateQuoteTotal([...items], discount));
  assert.equal(quoteDraftSchema.safeParse({ version: 0, lineItems: [item], discountCents: 1000, customerNotes: null, internalNotes: null, priceCents: 1 }).success, false);
});

test("saving a draft derives its total, trims notes and makes no payment or mail calls", async () => {
  const f = fixture();
  const saved = await f.workflow.save(id, {
    version: 0, lineItems: [{ description: " Carpet cleaning ", quantity: 2, unitPriceCents: 5500 }],
    discountCents: 500, customerNotes: " Agreed scope ", internalNotes: " Staff instructions ",
  });
  assert.equal(saved.priceCents, 10500);
  assert.equal(saved.lineItems[0].description, "Carpet cleaning");
  assert.equal(saved.customerNotes, "Agreed scope");
  assert.equal(saved.internalNotes, "Staff instructions");
  assert.equal(saved.status, "pending");
  assert.equal(saved.version, 1);
  assert.equal(f.created.length, 0);
  assert.equal(f.sent.length, 0);
});

test("percentage discounts round once to the nearest penny and reject unsafe percentages", () => {
  const smallItem = [{ description: "Detailed clean", quantity: 1, unitPriceCents: 1005 }];
  assert.deepEqual(calculateQuotePricing(smallItem, { discountType: "percentage", discountBasisPoints: 1000 }), {
    subtotalCents: 1005, discountCents: 101, totalCents: 904,
  });
  assert.deepEqual(calculateQuotePricing([item], { discountType: "percentage", discountBasisPoints: 1250 }), {
    subtotalCents: 15000, discountCents: 1875, totalCents: 13125,
  });
  for (const discountBasisPoints of [-1, 0.5, 10001, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateQuotePricing([item], { discountType: "percentage", discountBasisPoints }));
  }
  assert.throws(() => calculateQuotePricing([item], { discountType: "percentage", discountBasisPoints: 10000 }), /£1/);
  assert.throws(() => calculateQuotePricing(Array.from({ length: 20 }, () => ({ ...item, quantity: 100, unitPriceCents: 10_000_000 })),
    { discountType: "percentage", discountBasisPoints: 9999 }), "Derived discounts must fit the persisted monetary bounds");
});

test("saving a percentage derives its discount, retains the rate and recomputes changed items", async () => {
  const f = fixture();
  const first = await f.workflow.save(id, {
    version: 0, lineItems: [item], discountType: "percentage", discountBasisPoints: 1250,
    discountCents: 1,
  });
  assert.equal(first.discountType, "percentage");
  assert.equal(first.discountBasisPoints, 1250);
  assert.equal(first.discountCents, 1875, "Client-supplied monetary saving cannot override the percentage");
  assert.equal(first.priceCents, 13125);
  const second = await f.workflow.save(id, { version: first.version, lineItems: [{ ...item, quantity: 3 }] });
  assert.equal(second.discountBasisPoints, 1250);
  assert.equal(second.discountCents, 2813);
  assert.equal(second.priceCents, 19687);
  const fixed = await f.workflow.save(id, { version: second.version, discountType: "fixed", discountCents: 1234 });
  assert.equal(fixed.discountType, "fixed");
  assert.equal(fixed.discountBasisPoints, null);
  assert.equal(fixed.discountCents, 1234);
  assert.equal(fixed.priceCents, 21266);
  assert.equal(f.created.length + f.sent.length, 0);
});

test("legacy fixed-discount payloads stay compatible and stale percentage metadata is cleared", async () => {
  const f = fixture({ discountType: "percentage", discountBasisPoints: 1000, discountCents: 1500 });
  const saved = await f.workflow.save(id, {
    version: 0, lineItems: [item], discountCents: 2000, customerNotes: null, internalNotes: null,
  });
  assert.equal(saved.discountType, "fixed");
  assert.equal(saved.discountBasisPoints, null);
  assert.equal(saved.discountCents, 2000);
  assert.equal(saved.priceCents, 13000);
});

test("customer details can be corrected before pricing without changing the quote scope or totals", async () => {
  const f = fixture({ priceCents: null, lineItems: [], discountCents: 0 });
  const saved = await f.workflow.save(id, {
    version: 0, name: " Sam Jones ", email: " corrected@example.com ", phone: " +44 7771 114041 ",
    postcode: " SW1A 1AA ", preferredDate: "2020-02-29", serviceType: "carpet", propertySize: "studio",
    message: " Updated access request ",
  });
  assert.equal(saved.name, "Sam Jones");
  assert.equal(saved.email, "corrected@example.com");
  assert.equal(saved.phone, "+44 7771 114041");
  assert.equal(saved.postcode, "SW1A 1AA");
  assert.equal(saved.preferredDate?.toISOString(), "2020-02-29T12:00:00.000Z");
  assert.equal(saved.serviceType, "carpet");
  assert.equal(saved.propertySize, "studio");
  assert.equal(saved.message, "Updated access request");
  assert.equal(saved.customerNotes, initialQuote.customerNotes);
  assert.equal(saved.internalNotes, initialQuote.internalNotes);
  assert.equal(saved.priceCents, null);
  assert.deepEqual(saved.lineItems, []);
  assert.equal(saved.version, 1);
  const cleared = await f.workflow.save(id, { version: saved.version, postcode: "", preferredDate: null, message: null });
  assert.equal(cleared.postcode, null);
  assert.equal(cleared.preferredDate, null);
  assert.equal(cleared.message, null);
  assert.equal(f.created.length + f.sent.length, 0);
});

test("invalid contact data, calendar dates and privileged fields cannot enter a draft", async () => {
  const invalidChanges = [
    { name: " " }, { email: "client@example.com\r\nBcc: stranger@example.com" },
    { phone: "123" }, { phone: "07700900123<script>" }, { postcode: "X".repeat(13) },
    { preferredDate: "2026-02-29" }, { preferredDate: "2026-13-01" },
    { preferredDate: "2026-10-19T12:00:00Z" }, { serviceType: "removals" }, { propertySize: "castle" },
    { message: "X".repeat(5001) }, { status: "paid" }, { revolutOrderId: "foreign-order" },
    { checkoutUrl: "https://attacker.example" }, { priceCents: 1 }, { discountType: "free" },
    { discountType: "fixed", discountCents: 0, discountBasisPoints: 1000 },
    { discountType: "percentage", discountBasisPoints: null }, { discountBasisPoints: 1000 },
  ];
  const f = fixture();
  for (const changes of invalidChanges) {
    const payload = { version: 0, ...changes };
    assert.equal(quoteDraftSchema.safeParse(payload).success, false, JSON.stringify(changes));
    await assert.rejects(f.workflow.save(id, payload as never));
  }
  assert.equal(quoteDraftSchema.safeParse({ version: 0 }).success, false);
  assert.equal(quoteCustomerDetailsSchema.safeParse({
    name: initialQuote.name, email: initialQuote.email, phone: initialQuote.phone,
    serviceType: "deep", propertySize: "2bed", preferredDate: "2020-02-29",
  }).success, true);
  assert.equal(f.current().version, 0);
  assert.equal(f.events.length, 0);
});

test("the corrected recipient is used consistently for the approved quote and payment link", async () => {
  const f = fixture();
  const saved = await f.workflow.save(id, {
    version: 0, name: "Sam Jones", email: "sam@example.com", phone: "07700900456",
  });
  await f.workflow.send(id, saved.version);
  assert.equal(f.created[0].customerEmail, "sam@example.com");
  assert.equal(f.sent[0].to, "sam@example.com");
  assert.ok(f.sent[0].email.text.includes("Sam"));
  assert.ok(f.sent[0].email.text.includes("sam@example.com"));
  assert.ok(!f.sent[0].email.text.includes("alex@example.com"));
});

test("sending recomputes the percentage saving for payment and client email", async () => {
  const f = fixture({ discountType: "percentage", discountBasisPoints: 1250, discountCents: 1, priceCents: 13125 });
  await f.workflow.send(id, 0);
  assert.equal(f.created[0].amountCents, 13125);
  assert.equal(f.current().discountCents, 1875);
  assert.ok(f.sent[0].email.text.includes("12.5%"));
  assert.ok(f.sent[0].email.text.includes("£18.75"));
  assert.ok(f.sent[0].email.text.includes("£131.25"));
});

test("sending saves one matching payment link then emails only the approved customer quote", async () => {
  const f = fixture();
  const result = await f.workflow.send(id, 0);
  assert.equal(result.success, true);
  assert.equal(result.checkoutUrl, order.checkout_url);
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].amountCents, 14000);
  assert.equal(f.created[0].customerEmail, initialQuote.email);
  assert.equal(f.created[0].quoteId, id);
  assert.ok(f.events.indexOf("update") < f.events.indexOf("send"), "Link must be saved before email");
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].to, initialQuote.email);
  for (const value of [initialQuote.internalNotes!, initialQuote.message!]) {
    assert.ok(!f.sent[0].email.html.includes(value));
    assert.ok(!f.sent[0].email.text.includes(value));
  }
  assert.ok(f.sent[0].email.text.includes(initialQuote.customerNotes!));
  assert.ok(f.sent[0].email.text.includes("£140.00"));
  assert.equal(f.current().status, "quoted");
  assert.equal(f.current().version, 1);
  assert.ok(f.current().quoteEmailSentAt instanceof Date);
  assert.equal(f.current().sendStartedAt, null);
});

test("stale quote versions reject save, send and reopen before any external action", async () => {
  const f = fixture({ version: 2 });
  await assert.rejects(f.workflow.save(id, { version: 1, lineItems: [item], discountCents: 1000, customerNotes: null, internalNotes: null }), conflict);
  await assert.rejects(f.workflow.save(id, { version: 1, email: "stale@example.com" }), conflict);
  await assert.rejects(f.workflow.send(id, 1), conflict);
  await assert.rejects(f.workflow.reopen(id, 1), conflict);
  assert.equal(f.current().version, 2);
  assert.equal(f.current().email, initialQuote.email);
  assert.equal(f.created.length + f.sent.length + f.fetched.length + f.cancelled.length, 0);
});

test("email retry reuses the saved Revolut order after a failed first delivery", async () => {
  let deliveries = 0;
  const emails: string[] = [];
  const f = fixture({}, { send: async (input) => {
    deliveries++;
    emails.push(input.email.text);
    if (deliveries === 1) throw new Error("Provider unavailable");
    return { id: "test-message-id" };
  } });
  await assert.rejects(f.workflow.send(id, 0), (error: unknown) => {
    assert.ok(error instanceof QuoteWorkflowError);
    assert.equal(error.status, 502);
    assert.equal(error.quote?.checkoutUrl, order.checkout_url);
    return true;
  });
  assert.equal(f.current().status, "quoted");
  assert.equal(f.current().version, 0);
  assert.equal(f.current().sendStartedAt, null);
  assert.equal(f.current().quoteEmailSentAt, null);
  assert.equal(f.created.length, 1);
  await f.workflow.send(id, 0);
  assert.equal(f.created.length, 1, "A failed email must not create another payment order");
  assert.deepEqual(f.fetched, [orderId]);
  assert.equal(emails.length, 2);
  assert.equal(emails[0], emails[1]);
  assert.equal(f.current().version, 1);
});

test("issued quotes require verified payment cancellation before they become editable", async () => {
  const changes: Partial<Quote> = { status: "quoted", revolutOrderId: orderId, checkoutUrl: order.checkout_url, quoteEmailSentAt: new Date() };
  const f = fixture(changes);
  await assert.rejects(f.workflow.save(id, { version: 0, lineItems: [item], discountCents: 1000, customerNotes: null, internalNotes: null }), conflict);
  await assert.rejects(f.workflow.save(id, { version: 0, email: "new@example.com" }), conflict);
  const draft = await f.workflow.reopen(id, 0);
  assert.deepEqual(f.cancelled, [orderId]);
  assert.deepEqual(f.events, ["cancel", "update"]);
  assert.equal(draft.status, "pending");
  assert.equal(draft.checkoutUrl, null);
  assert.equal(draft.revolutOrderId, null);
  assert.equal(draft.quoteEmailSentAt, null);
  assert.equal(draft.version, 1);
  const corrected = await f.workflow.save(id, { version: draft.version, email: "new@example.com" });
  assert.equal(corrected.email, "new@example.com");
  assert.equal(corrected.status, "pending");
  const failed = fixture(changes, { cancelOrder: async () => { throw new Error("Order is processing, cancellation not verified"); } });
  await assert.rejects(failed.workflow.reopen(id, 0), /cancellation not verified/);
  assert.equal(failed.current().status, "quoted");
  assert.equal(failed.current().checkoutUrl, order.checkout_url);
  assert.equal(failed.current().revolutOrderId, orderId);
  assert.equal(failed.current().version, 0);
});

test("paid or cancelled quotes cannot be edited, emailed or reopened", async () => {
  for (const status of ["paid", "cancelled"] as const) {
    const f = fixture({ status });
    await assert.rejects(f.workflow.save(id, { version: 0, lineItems: [item], discountCents: 1000, customerNotes: null, internalNotes: null }), conflict);
    await assert.rejects(f.workflow.save(id, { version: 0, name: "Changed Name", email: "new@example.com" }), conflict);
    await assert.rejects(f.workflow.send(id, 0), conflict);
    await assert.rejects(f.workflow.reopen(id, 0), conflict);
    assert.equal(f.created.length + f.sent.length + f.cancelled.length, 0);
    assert.equal(f.current().email, initialQuote.email);
  }
});

test("a changed or nonpending payment order cannot be reused to email a quote", async () => {
  for (const providerOrder of [{ ...order, amount: 1 }, { ...order, currency: "EUR" }, { ...order, state: "completed" }, { ...order, checkout_url: "" }]) {
    const f = fixture({ status: "quoted", revolutOrderId: orderId, checkoutUrl: order.checkout_url }, { getOrder: async () => providerOrder });
    await assert.rejects(f.workflow.send(id, 0), conflict);
    assert.equal(f.sent.length, 0);
    assert.equal(f.created.length, 0);
  }
});

test("concurrent send attempts respect the persisted lease and create only one payment order", async () => {
  let releaseSend!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => { releaseSend = resolve; });
  const sending = new Promise<void>((resolve) => { started = resolve; });
  let sent = 0;
  const f = fixture({}, { send: async () => {
    sent++; started(); await gate;
    return { id: "test-message-id" };
  } });
  const first = f.workflow.send(id, 0);
  await sending;
  try {
    await assert.rejects(f.workflow.send(id, 0), conflict);
    await assert.rejects(f.workflow.reopen(id, 0), conflict);
    assert.equal(f.created.length, 1);
    assert.equal(sent, 1);
    assert.ok(f.current().sendStartedAt instanceof Date);
  } finally {
    releaseSend();
  }
  await first;
  assert.equal(f.current().sendStartedAt, null);
  assert.equal(f.current().version, 1);
});

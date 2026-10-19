import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { Quote } from "../src/lib/db/schema";
import type { RevolutOrder } from "../src/lib/revolut";
import { calculateQuoteTotal, quoteDraftSchema } from "../src/lib/quotes/pricing";
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
  lineItems: [item], discountCents: 1000, customerNotes: "Kitchen and bathroom included.",
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
  await assert.rejects(f.workflow.send(id, 1), conflict);
  await assert.rejects(f.workflow.reopen(id, 1), conflict);
  assert.equal(f.current().version, 2);
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
  const draft = await f.workflow.reopen(id, 0);
  assert.deepEqual(f.cancelled, [orderId]);
  assert.deepEqual(f.events, ["cancel", "update"]);
  assert.equal(draft.status, "pending");
  assert.equal(draft.checkoutUrl, null);
  assert.equal(draft.revolutOrderId, null);
  assert.equal(draft.quoteEmailSentAt, null);
  assert.equal(draft.version, 1);
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
    await assert.rejects(f.workflow.send(id, 0), conflict);
    await assert.rejects(f.workflow.reopen(id, 0), conflict);
    assert.equal(f.created.length + f.sent.length + f.cancelled.length, 0);
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

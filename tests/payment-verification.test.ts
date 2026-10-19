import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyCompletedCleaningOrder } from "../src/lib/payments/complete";
import { RevolutError, type RevolutOrder } from "../src/lib/revolut";

const quote = { id: "2307aabb-1122-3344-5566-77889900aabb", priceCents: 12_345, revolutOrderId: "6516e61c-d279-a454-a837-bc52ce55ed49" };
const order: RevolutOrder = {
  id: quote.revolutOrderId, token: "test", checkout_url: "https://checkout.revolut.com/payment-link/test",
  amount: 12_345, currency: "GBP", state: "completed", outstanding_amount: 0, refunded_amount: 0,
  metadata: { service: "goodycleaning", cleaningQuoteId: quote.id },
};

test("a completed fully-paid GBP order must match the stored quote before fulfillment", () => {
  assert.doesNotThrow(() => verifyCompletedCleaningOrder(order, quote));
  // Previously-created orders can lack metadata; the stored provider order ID binds them.
  assert.doesNotThrow(() => verifyCompletedCleaningOrder({ ...order, metadata: undefined }, quote));
  for (const unsafe of [
    { ...order, state: "pending" }, { ...order, state: "processing" },
    { ...order, state: "authorised" }, { ...order, state: "cancelled" },
    { ...order, amount: 12_344 }, { ...order, currency: "EUR" },
    { ...order, outstanding_amount: 1 }, { ...order, refunded_amount: 1 },
    { ...order, id: quote.id },
    { ...order, metadata: { service: "goodyvan" } },
    { ...order, metadata: { cleaningQuoteId: "other-quote" } },
  ]) assert.throws(() => verifyCompletedCleaningOrder(unsafe, quote), RevolutError);
  for (const unsafePrice of [null, 0, 99, 100.5, Number.NaN]) {
    assert.throws(() => verifyCompletedCleaningOrder(order, { ...quote, priceCents: unsafePrice }), RevolutError);
  }
});

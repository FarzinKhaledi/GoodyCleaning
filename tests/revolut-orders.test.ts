import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import {
  cancelRevolutOrder, createRevolutOrder, getRevolutOrder,
  isTrustedRevolutCheckoutUrl, RevolutError,
} from "../src/lib/revolut";

const keys = ["REVOLUT_SECRET_KEY", "REVOLUT_API_KEY", "REVOLUT_API_URL", "REVOLUT_ENVIRONMENT"] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const quoteId = "2307aabb-1122-3344-5566-77889900aabb";
const orderId = "6516e61c-d279-a454-a837-bc52ce55ed49";
const checkoutUrl = "https://checkout.revolut.com/payment-link/0adc0e3c-ab44-4f33-bcc0-534ded7354ce";
const input = { amountCents: 12_345, description: "Deep cleaning", customerEmail: "customer@example.com", quoteId };
const order = { id: orderId, token: "test-token", checkout_url: checkoutUrl, state: "pending", amount: 12_345, currency: "GBP", outstanding_amount: 12_345 };
const calls: Array<{ url: string; init?: RequestInit }> = [];

beforeEach(() => {
  for (const key of keys) delete process.env[key];
  process.env.REVOLUT_SECRET_KEY = "sk_generic-production-test-fixture";
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(order, { status: 201 });
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test("new orders use production for generic sk_ keys and isolate Cleaning references", async () => {
  const result = await createRevolutOrder(input, `cleaning/${quoteId}/1`);
  assert.equal(result.checkout_url, checkoutUrl);
  assert.equal(calls[0].url, "https://merchant.revolut.com/api/orders");
  assert.equal(new Headers(calls[0].init?.headers).get("Idempotency-Key"), null);
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(calls[0].init?.redirect, "error");
  assert.ok(calls[0].init?.signal instanceof AbortSignal);
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.amount, 12_345);
  assert.equal(body.currency, "GBP");
  assert.deepEqual(body.metadata, { service: "goodycleaning", cleaningQuoteId: quoteId });
  assert.deepEqual(body.merchant_order_data, { reference: `GC-${quoteId}` });
  assert.equal(body.merchant_order_ext_ref, undefined);
  assert.equal(body.capture_mode, "automatic");
  assert.equal(body.expire_pending_after, "P30D");
});

test("explicit Sandbox selection is supported without treating all sk_ keys as Sandbox", async () => {
  process.env.REVOLUT_ENVIRONMENT = "sandbox";
  await createRevolutOrder(input);
  assert.equal(calls[0].url, "https://sandbox-merchant.revolut.com/api/orders");
  calls.length = 0;
  delete process.env.REVOLUT_ENVIRONMENT;
  process.env.REVOLUT_SECRET_KEY = "sk_test_fixture";
  await createRevolutOrder(input);
  assert.equal(calls[0].url, "https://sandbox-merchant.revolut.com/api/orders");
});

test("provider configuration cannot leak credentials to arbitrary hosts or cross environments", async () => {
  for (const url of [
    "https://attacker.example/api", "http://merchant.revolut.com/api",
    "https://merchant.revolut.com.attacker.example/api", "https://merchant.revolut.com/api?secret=1",
    "https://user:password@merchant.revolut.com/api", "https://merchant.revolut.com/other",
  ]) {
    process.env.REVOLUT_API_URL = url;
    await assert.rejects(getRevolutOrder(orderId), (error) => error instanceof RevolutError && error.reason === "configuration");
  }
  process.env.REVOLUT_SECRET_KEY = "sk_live_fixture";
  process.env.REVOLUT_API_URL = "https://sandbox-merchant.revolut.com/api";
  await assert.rejects(createRevolutOrder(input), RevolutError);
  assert.equal(calls.length, 0);
});

test("missing credentials never invent a paid-looking development checkout", async () => {
  delete process.env.REVOLUT_SECRET_KEY;
  await assert.rejects(createRevolutOrder(input), (error) => error instanceof RevolutError && error.reason === "configuration");
  assert.equal(calls.length, 0);
});

test("invalid prices, references, redirect origins and header injection never call the provider", async () => {
  for (const params of [
    { ...input, amountCents: 100.5 }, { ...input, amountCents: -1 }, { ...input, amountCents: Number.MAX_SAFE_INTEGER },
    { ...input, currency: "EUR" }, { ...input, quoteId: "../other" },
    { ...input, redirectUrl: "https://attacker.example/success" },
    { ...input, customerEmail: "customer@example.com\r\nInjected: true" },
  ]) await assert.rejects(createRevolutOrder(params), RevolutError);
  await assert.rejects(createRevolutOrder(input, "bad\r\nkey"), RevolutError);
  assert.equal(calls.length, 0);
});

test("only trusted HTTPS Revolut hosted payment links are accepted", async () => {
  assert.equal(isTrustedRevolutCheckoutUrl(checkoutUrl), true);
  assert.equal(isTrustedRevolutCheckoutUrl(checkoutUrl.replace("checkout.", "sandbox-checkout.")), true);
  for (const bad of [
    "http://checkout.revolut.com/payment-link/test", "https://attacker.example/payment-link/test",
    "https://checkout.revolut.com.attacker.example/payment-link/test", "https://checkout.revolut.com/",
    "https://user:password@checkout.revolut.com/payment-link/test", "javascript:alert(1)",
  ]) {
    globalThis.fetch = async () => Response.json({ ...order, checkout_url: bad });
    await assert.rejects(createRevolutOrder(input), (error) => error instanceof RevolutError && error.reason === "response");
  }
});

test("provider amounts and order identifiers are verified instead of trusting success HTTP status", async () => {
  for (const malformed of [
    { ...order, amount: 12_344 }, { ...order, currency: "EUR" }, { ...order, id: "invalid" },
    { ...order, state: "completed" }, { ...order, amount: 100.5 },
  ]) {
    globalThis.fetch = async () => Response.json(malformed);
    await assert.rejects(createRevolutOrder(input), RevolutError);
  }
  globalThis.fetch = async () => Response.json({ ...order, id: quoteId });
  await assert.rejects(getRevolutOrder(orderId), RevolutError);
});

test("provider failures expose only safe categories and status, never raw response/customer details", async () => {
  globalThis.fetch = async () => new Response("customer@example.com SECRET_PROVIDER_BODY", { status: 422 });
  await assert.rejects(createRevolutOrder(input), (error) => {
    assert.ok(error instanceof RevolutError);
    assert.equal(error.status, 422);
    assert.equal(error.reason, "request");
    assert.doesNotMatch(error.message, /SECRET_PROVIDER_BODY|customer@example/);
    return true;
  });
  globalThis.fetch = async () => { throw new Error("SECRET_TRANSPORT_DETAIL"); };
  await assert.rejects(getRevolutOrder(orderId), (error) => {
    assert.ok(error instanceof RevolutError);
    assert.doesNotMatch(error.message, /SECRET_TRANSPORT_DETAIL/);
    return true;
  });
});

test("order cancellation confirms provider state and never cancels completed payments", async () => {
  const responses = [order, {}, { ...order, state: "cancelled" }];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(responses.shift());
  };
  assert.equal((await cancelRevolutOrder(orderId)).state, "cancelled");
  assert.deepEqual(calls.map((call) => call.init?.method ?? "GET"), ["GET", "POST", "GET"]);
  assert.equal(calls[1].url, `https://merchant.revolut.com/api/orders/${orderId}/cancel`);
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ ...order, state: "completed" });
  };
  await assert.rejects(cancelRevolutOrder(orderId), (error) => error instanceof RevolutError && error.reason === "verification");
  assert.equal(calls.length, 1);
});

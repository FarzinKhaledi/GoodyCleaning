import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, beforeEach, test } from "node:test";
import { verifyRevolutWebhookSignature } from "../src/lib/revolut";
import { POST } from "../src/app/api/webhooks/revolut/route";

const originalSecret = process.env.REVOLUT_WEBHOOK_SECRET;
const secret = "test-webhook-secret";
const payload = '{"event":"ORDER_COMPLETED","order_id":"test-order"}';

beforeEach(() => { process.env.REVOLUT_WEBHOOK_SECRET = secret; });
after(() => {
  if (originalSecret === undefined) delete process.env.REVOLUT_WEBHOOK_SECRET;
  else process.env.REVOLUT_WEBHOOK_SECRET = originalSecret;
});

function sign(body: string, timestamp: string) {
  return `v1=${crypto.createHmac("sha256", secret).update(`v1.${timestamp}.${body}`).digest("hex")}`;
}

test("valid current webhook signatures are accepted, including secret rotation", () => {
  const timestamp = String(Date.now());
  const signature = sign(payload, timestamp);
  assert.equal(verifyRevolutWebhookSignature(payload, signature, timestamp), true);
  assert.equal(verifyRevolutWebhookSignature(payload, `v1=${"0".repeat(64)}, ${signature}`, timestamp), true);
});

test("stale, tampered, malformed and unsigned webhooks are rejected", () => {
  const timestamp = String(Date.now());
  const signature = sign(payload, timestamp);
  const staleTimestamp = String(Date.now() - 6 * 60 * 1000);
  const futureTimestamp = String(Date.now() + 6 * 60 * 1000);
  assert.equal(verifyRevolutWebhookSignature(`${payload} `, signature, timestamp), false);
  assert.equal(verifyRevolutWebhookSignature(payload, sign(payload, staleTimestamp), staleTimestamp), false);
  assert.equal(verifyRevolutWebhookSignature(payload, sign(payload, futureTimestamp), futureTimestamp), false);
  assert.equal(verifyRevolutWebhookSignature(payload, signature, "not-a-timestamp"), false);
  assert.equal(verifyRevolutWebhookSignature(payload, signature.slice(3), timestamp), false);
  assert.equal(verifyRevolutWebhookSignature(payload, null, timestamp), false);
  delete process.env.REVOLUT_WEBHOOK_SECRET;
  assert.equal(verifyRevolutWebhookSignature(payload, signature, timestamp), false);
});

test("webhook route ignores non-completion events and validates payload shape", async () => {
  for (const [body, status] of [
    ['{"state":"COMPLETED"}', 200],
    ['{"event":"ORDER_COMPLETED"}', 400],
    ["null", 400],
    ["{", 400],
  ] as const) {
    const timestamp = String(Date.now());
    const response = await POST(new Request("http://localhost/api/webhooks/revolut", {
      method: "POST",
      body,
      headers: { "revolut-signature": sign(body, timestamp), "revolut-request-timestamp": timestamp },
    }));
    assert.equal(response.status, status, body);
  }
});

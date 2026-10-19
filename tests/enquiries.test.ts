import assert from "node:assert/strict";
import { after, beforeEach, test, type TestContext } from "node:test";
import { POST } from "../src/app/api/enquiries/route";
import { enquirySchema } from "../src/lib/validations";

const envKeys = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER", "GMAIL_USER"] as const;
const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
let clientNumber = 0;
const enquiry = {
  name: " José Smith ",
  email: " jose@example.com ",
  phone: " +44 7700 900123 ",
  serviceType: "deep",
  propertySize: "2bed",
  postcode: " SW1A 1AA ",
  preferredDate: "2099-01-01",
  message: "Please discuss access. Thank you ✨",
  website: "",
};

beforeEach(() => {
  Object.assign(process.env, {
    GMAIL_CLIENT_ID: "test-client-id",
    GMAIL_CLIENT_SECRET: "test-client-secret",
    GMAIL_REFRESH_TOKEN: "test-refresh-token",
    GMAIL_SENDER: "sender@example.com",
    GMAIL_USER: "fallback@example.com",
  });
});
after(() => {
  for (const key of envKeys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function request(body: unknown = enquiry, headers: Record<string, string> = {}) {
  return new Request("https://goodycleaning.co.uk/api/enquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://goodycleaning.co.uk",
      "X-Forwarded-For": `192.0.2.${++clientNumber}`,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function provider(t: TestContext, failure?: "token" | "send" | "missing-token" | "missing-id" | "timeout") {
  // Every route test replaces fetch before any request; no live provider calls are possible.
  const calls: { url: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(init?.cache, "no-store");
    if (failure === "timeout") throw new DOMException("Sensitive provider details", "TimeoutError");
    if (url === "https://oauth2.googleapis.com/token") {
      if (failure === "token") return Response.json({ error: "test-refresh-token" }, { status: 400 });
      return Response.json(failure === "missing-token" ? {} : { access_token: "test-access-token" });
    }
    assert.equal(url, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    if (failure === "send") return Response.json({ error: "jose@example.com test-access-token" }, { status: 500 });
    return Response.json(failure === "missing-id" ? {} : { id: "test-delivered-message" });
  });
  return calls;
}

test("enquiry schema requires genuine contact fields and bounds optional inputs", () => {
  const parsed = enquirySchema.parse(enquiry);
  assert.equal(parsed.name, "José Smith");
  assert.equal(parsed.email, "jose@example.com");
  assert.equal(parsed.postcode, "SW1A 1AA");
  for (const change of [
    { name: " " }, { name: undefined }, { email: "invalid" }, { email: undefined },
    { phone: "abcdefghijk" }, { phone: undefined }, { phone: "1".repeat(41) },
    { serviceType: "unknown" }, { propertySize: "unknown" },
    { postcode: "1".repeat(13) }, { message: "x".repeat(5001) },
    { preferredDate: "2099-02-29" }, { preferredDate: "2000-01-01" }, { website: "spam" },
  ]) {
    assert.equal(enquirySchema.safeParse({ ...enquiry, ...change }).success, false);
  }
});

test("missing or invalid contact data returns field errors without contacting Gmail", async (t) => {
  const calls = provider(t);
  for (const [field, value] of [["name", undefined], ["email", "invalid"], ["phone", "123"]] as const) {
    const response = await POST(request({ ...enquiry, [field]: value }));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.ok(Array.isArray(body.fieldErrors[field]));
    assert.notEqual(body.success, true);
  }
  assert.equal(calls.length, 0);
});

test("valid enquiry sends all fields with fixed recipient, safe MIME and customer Reply-To", async (t) => {
  const calls = provider(t);
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(calls.length, 2);
  const refreshBody = new URLSearchParams(String(calls[0].init?.body));
  assert.equal(refreshBody.get("grant_type"), "refresh_token");
  assert.equal(refreshBody.get("refresh_token"), "test-refresh-token");
  assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer test-access-token");

  const { raw } = JSON.parse(String(calls[1].init?.body));
  assert.match(raw, /^[\w-]+$/);
  const [headers, encodedBody] = Buffer.from(raw, "base64url").toString("utf8").split("\r\n\r\n");
  assert.match(headers, /From: GoodyCleaning <sender@example.com>/);
  assert.match(headers, /To: support@goodyvan.com/);
  assert.match(headers, /Reply-To: jose@example.com/);
  assert.match(headers, /Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
  assert.match(headers, /Content-Type: text\/plain; charset="UTF-8"/);
  const body = Buffer.from(encodedBody, "base64").toString("utf8");
  for (const value of ["José Smith", "jose@example.com", "+44 7700 900123", "Deep Cleaning", "2 Bedrooms", "SW1A 1AA", "2099-01-01", enquiry.message]) {
    assert.ok(body.includes(value), value);
  }
});

test("missing or invalid mail configuration fails closed with no stub success", async (t) => {
  const calls = provider(t);
  delete process.env.GMAIL_CLIENT_SECRET;
  let response = await POST(request());
  assert.equal(response.status, 503);
  assert.notEqual((await response.json()).success, true);
  process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
  process.env.GMAIL_SENDER = "sender@example.com\r\nBcc: attacker@example.com";
  response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test("GMAIL_USER is a valid sender fallback and Origin may be absent", async (t) => {
  const calls = provider(t);
  delete process.env.GMAIL_SENDER;
  const input = request();
  input.headers.delete("origin");
  const response = await POST(input);
  assert.equal(response.status, 200);
  const { raw } = JSON.parse(String(calls[1].init?.body));
  assert.match(Buffer.from(raw, "base64url").toString("utf8"), /From: GoodyCleaning <fallback@example.com>/);
});

test("Gmail token, send, malformed-response and timeout failures never acknowledge delivery", async (t) => {
  for (const failure of ["token", "send", "missing-token", "missing-id", "timeout"] as const) {
    const calls = provider(t, failure);
    const response = await POST(request());
    assert.equal(response.status, 502, failure);
    const body = await response.text();
    assert.ok(!body.includes('"success":true'));
    assert.ok(!body.includes("test-refresh-token"));
    assert.ok(!body.includes("test-access-token"));
    assert.ok(!body.includes("jose@example.com"));
    assert.ok(calls.length >= 1);
  }
});

test("origin, JSON, honeypot and request-size checks reject requests before sending", async (t) => {
  const calls = provider(t);
  for (const [input, headers, status] of [
    [enquiry, { Origin: "https://another.example" }, 403],
    [enquiry, { "Content-Type": "text/plain" }, 415],
    ["{", {}, 400],
    [{ ...enquiry, website: "https://spam.example" }, {}, 400],
    ["x".repeat(33 * 1024), {}, 413],
  ] as const) {
    const response = await POST(request(input, headers));
    assert.equal(response.status, status);
  }
  assert.equal(calls.length, 0);
});

test("per-instance burst guard limits repeated delivery attempts", async (t) => {
  const calls = provider(t);
  const headers = { "X-Forwarded-For": "198.51.100.10" };
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await POST(request(enquiry, headers))).status, 200);
  }
  const limited = await POST(request(enquiry, headers));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);
  assert.equal(calls.length, 10);
});

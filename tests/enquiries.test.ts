import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    GMAIL_SENDER: "support@goodyvan.com",
    GMAIL_USER: "support@goodyvan.com",
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

function provider(t: TestContext, failure?: "token" | "send" | "ack" | "missing-token" | "missing-id" | "timeout") {
  // Every route test replaces fetch before any request; no live provider calls are possible.
  const calls: { url: string; init?: RequestInit }[] = [];
  let sends = 0;
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
    sends += 1;
    if (failure === "send" || (failure === "ack" && sends === 2)) return Response.json({ error: "jose@example.com test-access-token" }, { status: 500 });
    return Response.json(failure === "missing-id" ? {} : { id: "test-delivered-message" });
  });
  return calls;
}

function decodeMessage(call: { init?: RequestInit }) {
  const { raw } = JSON.parse(String(call.init?.body));
  assert.match(raw, /^[\w-]+$/);
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  const headers = mime.split("\r\n\r\n")[0];
  assert.match(headers, /Content-Type: multipart\/related;/);
  assert.match(mime, /Content-Type: multipart\/alternative;/);
  const parts = Array.from(mime.matchAll(/Content-Type: (text\/plain|text\/html|image\/png)[^\r\n]*\r\n([\s\S]*?)\r\n\r\n([\s\S]*?)(?=\r\n--)/g));
  assert.equal(parts.length, 3);
  for (const part of parts) {
    assert.match(part[2], /Content-Transfer-Encoding: base64/);
    assert.ok(part[3].split("\r\n").every((line) => line.length <= 76));
  }
  const text = Buffer.from(parts[0][3], "base64").toString("utf8");
  const html = Buffer.from(parts[1][3], "base64").toString("utf8");
  const image = Buffer.from(parts[2][3], "base64");
  assert.match(parts[2][2], /Content-ID: <goodycleaning-logo>/);
  assert.match(parts[2][2], /Content-Disposition: inline;/);
  assert.deepEqual(image, readFileSync("src/lib/mail/assets/goodycleaning-logo.png"));
  assert.match(html, /src=["']cid:goodycleaning-logo["']/);
  const subject = headers.match(/Subject: ([\s\S]+?)(?=\r\n[A-Za-z-]+:)/)?.[1];
  assert.ok(subject);
  assert.match(subject, /^=\?UTF-8\?B\?/);
  const decodedSubject = Array.from(subject.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g))
    .map((word) => Buffer.from(word[1], "base64").toString("utf8")).join("");
  assert.ok(decodedSubject.length > 0 && !decodedSubject.includes("�"));
  return { mime, headers, text, html };
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

test("valid enquiry sends branded admin and customer messages with safe CID MIME", async (t) => {
  const calls = provider(t);
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, acknowledgementSent: true });
  assert.equal(calls.length, 3);
  const refreshBody = new URLSearchParams(String(calls[0].init?.body));
  assert.equal(refreshBody.get("grant_type"), "refresh_token");
  assert.equal(refreshBody.get("refresh_token"), "test-refresh-token");
  assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer test-access-token");

  const admin = decodeMessage(calls[1]);
  const customer = decodeMessage(calls[2]);
  assert.match(admin.headers, /From: GoodyCleaning <support@goodyvan.com>/);
  assert.match(admin.headers, /To: support@goodyvan.com/);
  assert.match(admin.headers, /Reply-To: jose@example.com/);
  assert.match(admin.headers, /Auto-Submitted: auto-generated/);
  assert.match(customer.headers, /From: GoodyCleaning <support@goodyvan.com>/);
  assert.match(customer.headers, /To: jose@example.com/);
  assert.match(customer.headers, /Reply-To: support@goodyvan.com/);
  assert.match(customer.headers, /Auto-Submitted: auto-replied/);
  assert.match(customer.headers, /X-Auto-Response-Suppress: All/);
  for (const value of ["José Smith", "jose@example.com", "+44 7700 900123", "Deep Cleaning", "2 Bedrooms", "SW1A 1AA", "1 January 2099", enquiry.message]) {
    assert.ok(admin.text.includes(value), value);
  }
  assert.ok(!customer.text.includes(enquiry.message));
});

test("missing or invalid mail configuration fails closed with no stub success", async (t) => {
  const calls = provider(t);
  delete process.env.GMAIL_CLIENT_SECRET;
  let response = await POST(request());
  assert.equal(response.status, 503);
  assert.notEqual((await response.json()).success, true);
  process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
  process.env.GMAIL_SENDER = "different-valid-sender@example.com";
  response = await POST(request());
  assert.equal(response.status, 503);
  process.env.GMAIL_SENDER = "sender@example.com\r\nBcc: attacker@example.com";
  response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
});

test("support GMAIL_USER is a valid fallback and Origin may be absent", async (t) => {
  const calls = provider(t);
  delete process.env.GMAIL_SENDER;
  const input = request();
  input.headers.delete("origin");
  const response = await POST(input);
  assert.equal(response.status, 200);
  assert.match(decodeMessage(calls[1]).headers, /From: GoodyCleaning <support@goodyvan.com>/);
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
    assert.ok(calls.length <= 2, "No customer acknowledgement follows a failed admin delivery");
  }
});

test("acknowledgement failure keeps a successful recorded enquiry and logs no personal data", async (t) => {
  const calls = provider(t, "ack");
  const warnings: unknown[][] = [];
  t.mock.method(console, "warn", (...values: unknown[]) => { warnings.push(values); });
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, acknowledgementSent: false });
  assert.equal(calls.length, 3);
  assert.equal(warnings.length, 1);
  const log = JSON.stringify(warnings);
  assert.ok(!log.includes("jose@example.com"));
  assert.ok(!log.includes("test-access-token"));
  assert.ok(!log.includes("test-refresh-token"));
});

test("HTML escapes enquiry text while the customer acknowledgement excludes free text", async (t) => {
  const calls = provider(t);
  const response = await POST(request({
    ...enquiry,
    name: "<Alex & Co>",
    message: '<script>alert("test")</script>\nSecond line ✨',
  }));
  assert.equal(response.status, 200);
  const admin = decodeMessage(calls[1]);
  const customer = decodeMessage(calls[2]);
  assert.ok(admin.html.includes("&lt;Alex &amp; Co&gt;"));
  assert.ok(admin.html.includes("&lt;script&gt;"));
  assert.ok(!admin.html.includes("<script>"));
  assert.ok(admin.text.includes("Second line ✨"));
  assert.ok(!customer.html.includes("alert("));
  assert.ok(!customer.text.includes("alert("));
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
  assert.equal(calls.length, 15);
});

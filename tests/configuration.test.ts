import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { createElement } from "react";

test("missing production services fail safely without confirming payments or emails", async () => {
  const original = { ...process.env };
  // Import after explicitly removing credentials so this test cannot contact services.
  delete process.env.DATABASE_URL;
  process.env.RESEND_API_KEY = "";
  process.env.REVOLUT_SECRET_KEY = "";
  process.env.REVOLUT_API_KEY = "";
  process.env.REVOLUT_WEBHOOK_SECRET = "configuration-test-secret";
  Object.assign(process.env, { NODE_ENV: "production" });

  try {
    const { requireDb } = await import("../src/lib/db");
    const { sendEmail } = await import("../src/lib/mail/resend");
    const { createRevolutOrder } = await import("../src/lib/revolut");
    const { POST } = await import("../src/app/api/webhooks/revolut/route");

    assert.throws(requireDb, /DATABASE_URL is not configured/);
    await assert.rejects(sendEmail({
      to: "test@example.com",
      subject: "Test",
      react: createElement("p", null, "Test"),
    }), /Email delivery is not configured/);
    await assert.rejects(createRevolutOrder({
      amountCents: 100,
      description: "Test",
      customerEmail: "test@example.com",
      quoteId: "test",
    }), /Revolut payments are not configured/);

    const body = '{"event":"ORDER_COMPLETED","order_id":"test-order"}';
    const timestamp = String(Date.now());
    const signature = crypto.createHmac("sha256", process.env.REVOLUT_WEBHOOK_SECRET)
      .update(`v1.${timestamp}.${body}`).digest("hex");
    const originalConsoleError = console.error;
    let loggedDatabaseFailure = false;
    console.error = (_message: unknown, error: unknown) => {
      loggedDatabaseFailure = error instanceof Error && error.message === "DATABASE_URL is not configured";
    };
    try {
      const response = await POST(new Request("http://localhost/api/webhooks/revolut", {
        method: "POST",
        body,
        headers: { "revolut-signature": `v1=${signature}`, "revolut-request-timestamp": timestamp },
      }));
      assert.equal(response.status, 500);
      assert.equal(loggedDatabaseFailure, true);
    } finally {
      console.error = originalConsoleError;
    }
  } finally {
    for (const key of ["DATABASE_URL", "RESEND_API_KEY", "REVOLUT_SECRET_KEY", "REVOLUT_API_KEY", "REVOLUT_WEBHOOK_SECRET", "NODE_ENV"]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

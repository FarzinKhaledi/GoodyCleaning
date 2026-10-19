import assert from "node:assert/strict";
import { test } from "node:test";

test("enquiry launch mode blocks instant checkout before accessing services", async () => {
  const original = process.env.NEXT_PUBLIC_INSTANT_BOOKING_ENABLED;
  delete process.env.NEXT_PUBLIC_INSTANT_BOOKING_ENABLED;
  try {
    const { POST } = await import("../src/app/api/checkout/instant/route");
    const response = await POST(new Request("http://localhost/api/checkout/instant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Example Customer",
        email: "customer@example.invalid",
        phone: "07700900123",
        serviceType: "deep",
        propertySize: "1bed",
        preferredDate: "",
        message: "",
      }),
    }));
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /personalised quote/);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_INSTANT_BOOKING_ENABLED;
    else process.env.NEXT_PUBLIC_INSTANT_BOOKING_ENABLED = original;
  }
});

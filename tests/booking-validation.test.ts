import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingSchema, getBookingMinDate, quotePriceSchema } from "../src/lib/validations";
import { POST as instantCheckout } from "../src/app/api/checkout/instant/route";
import { POST as requestQuote } from "../src/app/api/quotes/request/route";

const booking = {
  name: " Alex Smith ",
  email: " alex@example.com ",
  phone: " +44 7700 900123 ",
  serviceType: "deep",
  propertySize: "1bed",
  preferredDate: "2099-01-01",
};

test("the booking minimum uses London's calendar date through daylight saving", () => {
  assert.equal(getBookingMinDate(new Date("2026-06-30T23:30:00Z")), "2026-07-01");
  assert.equal(getBookingMinDate(new Date("2026-12-31T23:30:00Z")), "2026-12-31");
});

test("booking values are trimmed before storage", () => {
  const parsed = bookingSchema.parse(booking);
  assert.equal(parsed.name, "Alex Smith");
  assert.equal(parsed.email, "alex@example.com");
  assert.equal(parsed.phone, "+44 7700 900123");
});

test("booking dates reject past, impossible and malformed dates", () => {
  for (const preferredDate of ["2000-01-01", "2099-02-29", "2099-04-31", "2099-13-01", "not-a-date", "2099-1-1"]) {
    assert.equal(bookingSchema.safeParse({ ...booking, preferredDate }).success, false, preferredDate);
  }
  assert.equal(bookingSchema.safeParse({ ...booking, preferredDate: "2400-02-29" }).success, true);
  assert.equal(bookingSchema.safeParse({ ...booking, preferredDate: "" }).success, true);
  assert.equal(bookingSchema.safeParse({ ...booking, preferredDate: undefined }).success, true);
});

test("blank names and phone numbers without valid digits are rejected", () => {
  assert.equal(bookingSchema.safeParse({ ...booking, name: "  " }).success, false);
  for (const phone of ["abcdefghij", "123456789", "1234567890123456"]) {
    assert.equal(bookingSchema.safeParse({ ...booking, phone }).success, false);
  }
});

test("quote prices fit integer pence stored by Postgres", () => {
  assert.equal(quotePriceSchema.safeParse({ priceCents: "12345" }).success, true);
  for (const priceCents of [99, 100.5, Infinity, 2147483648]) {
    assert.equal(quotePriceSchema.safeParse({ priceCents }).success, false);
  }
});

test("malformed JSON returns a client error before database access", async () => {
  for (const handler of [instantCheckout, requestQuote]) {
    const response = await handler(new Request("http://localhost/api/booking", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }));
    assert.equal(response.status, 400);
  }
});

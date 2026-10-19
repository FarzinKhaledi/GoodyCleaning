import { NextResponse } from "next/server";
import { isRevolutOrderId, RevolutError, verifyRevolutWebhookSignature } from "@/lib/revolut";
import { completePayment } from "@/lib/payments/complete";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY_BYTES = 128 * 1024;

async function readPayload(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    if (payload === null) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const signature = request.headers.get("revolut-signature");
    const timestamp = request.headers.get("revolut-request-timestamp");

    if (!verifyRevolutWebhookSignature(payload, signature, timestamp)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event;
    try {
      event = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (event.event !== "ORDER_COMPLETED") {
      return NextResponse.json({ received: true });
    }

    if (!isRevolutOrderId(event.order_id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    await completePayment(event.order_id);

    return NextResponse.json({ received: true });
  } catch (error) {
    // Raw provider/database errors can contain customer details or credentials.
    console.error("[payments] Webhook processing failed.", error instanceof RevolutError ? error.reason : "delivery-or-database");
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

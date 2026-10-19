import { NextResponse } from "next/server";
import { verifyRevolutWebhookSignature } from "@/lib/revolut";
import { completePayment } from "@/lib/payments/complete";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
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

    if (typeof event.order_id !== "string" || !event.order_id) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    await completePayment(event.order_id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

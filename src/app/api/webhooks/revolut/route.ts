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

    const event = JSON.parse(payload);

    if (event.event !== "ORDER_COMPLETED" && event.state !== "COMPLETED") {
      return NextResponse.json({ received: true });
    }

    const quoteId =
      event.merchant_order_ext_ref ?? event.data?.merchant_order_ext_ref;

    if (!quoteId) {
      return NextResponse.json({ received: true });
    }

    await completePayment(quoteId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

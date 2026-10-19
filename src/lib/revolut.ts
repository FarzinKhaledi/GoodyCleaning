import crypto from "crypto";
import { siteConfig } from "./config";

const REVOLUT_SECRET_KEY =
  process.env.REVOLUT_SECRET_KEY ?? process.env.REVOLUT_API_KEY;

const IS_SANDBOX =
  REVOLUT_SECRET_KEY?.startsWith("sk_") &&
  !REVOLUT_SECRET_KEY.startsWith("sk_live_");

const REVOLUT_API_URL =
  process.env.REVOLUT_API_URL ??
  (IS_SANDBOX
    ? "https://sandbox-merchant.revolut.com/api/1.0"
    : "https://merchant.revolut.com/api/1.0");

export interface CreateOrderParams {
  amountCents: number;
  currency?: string;
  description: string;
  customerEmail: string;
  quoteId: string;
  redirectUrl?: string;
}

export interface RevolutOrder {
  id: string;
  token: string;
  checkout_url: string;
  state: string;
}

export async function createRevolutOrder(
  params: CreateOrderParams
): Promise<RevolutOrder> {
  if (!REVOLUT_SECRET_KEY) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("Revolut payments are not configured");
    }
    // Dev fallback when Revolut is not configured
    const mockId = `mock_${params.quoteId}_${Date.now()}`;
    return {
      id: mockId,
      token: mockId,
      checkout_url: `${siteConfig.url}/booking/success?order=${mockId}&quote=${params.quoteId}`,
      state: "PENDING",
    };
  }

  const response = await fetch(`${REVOLUT_API_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REVOLUT_SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Revolut-Api-Version": "2024-09-01",
    },
    body: JSON.stringify({
      amount: params.amountCents,
      currency: params.currency ?? "GBP",
      description: params.description,
      customer: { email: params.customerEmail },
      merchant_order_ext_ref: params.quoteId,
      redirect_url:
        params.redirectUrl ??
        `${siteConfig.url}/booking/success?quote=${params.quoteId}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Revolut order creation failed (${response.status}): ${error}`
    );
  }

  const data = await response.json();

  return {
    id: data.id,
    token: data.token ?? data.public_id,
    checkout_url: data.checkout_url,
    state: data.state,
  };
}

export function verifyRevolutWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  const secret = process.env.REVOLUT_WEBHOOK_SECRET;

  if (!secret) return false;

  if (!signatureHeader || !timestampHeader) return false;

  // Reject stale deliveries and replays. Revolut timestamps are milliseconds.
  if (!/^\d+$/.test(timestampHeader)) return false;
  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return false;
  }

  const payloadToSign = `v1.${timestampHeader}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  // During signing-secret rotation Revolut may supply multiple v1 signatures.
  return signatureHeader.split(",").some((signature) => {
    const match = /^v1=([a-f\d]{64})$/i.exec(signature.trim());
    if (!match) return false;
    return crypto.timingSafeEqual(Buffer.from(match[1], "hex"), Buffer.from(expected, "hex"));
  });
}

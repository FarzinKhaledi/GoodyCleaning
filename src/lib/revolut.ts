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

  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  if (!signatureHeader || !timestampHeader) return false;

  // Revolut sends `Revolut-Signature: v1={hex}` and signs `v1.{timestamp}.{body}`
  const providedHash = signatureHeader.startsWith("v1=")
    ? signatureHeader.slice(3)
    : signatureHeader;

  const payloadToSign = `v1.${timestampHeader}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex");

  try {
    const a = Buffer.from(providedHash, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

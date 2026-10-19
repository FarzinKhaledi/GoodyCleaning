import crypto from "node:crypto";
import { siteConfig } from "./config";

const REQUEST_TIMEOUT_MS = 10_000;
const API_VERSION = "2024-09-01";
const ORDER_ID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const ORDER_STATES = new Set(["pending", "processing", "authorised", "completed", "cancelled", "failed", "expired"]);

export class RevolutError extends Error {
  constructor(
    public readonly reason: "configuration" | "input" | "request" | "response" | "verification",
    public readonly status?: number,
  ) {
    // Provider responses can contain customer details; never include them in errors.
    super(reason === "configuration" ? "Revolut payments are not configured correctly." : "Unable to complete the Revolut request safely.");
    this.name = "RevolutError";
  }
}

function configuration() {
  const secretKey = (process.env.REVOLUT_SECRET_KEY ?? process.env.REVOLUT_API_KEY)?.trim();
  if (!secretKey || /[\r\n]/.test(secretKey)) throw new RevolutError("configuration");

  // Revolut's documented production keys also use the generic sk_ prefix.
  // A generic sk_ key must never be interpreted as a Sandbox credential.
  const keyEnvironment = /^sk_(?:test|sandbox)_/.test(secretKey)
    ? "sandbox"
    : /^sk_live_/.test(secretKey) ? "production" : undefined;
  const explicitEnvironment = process.env.REVOLUT_ENVIRONMENT?.trim().toLowerCase();
  if (explicitEnvironment && explicitEnvironment !== "production" && explicitEnvironment !== "sandbox") {
    throw new RevolutError("configuration");
  }

  let base: URL;
  try {
    base = new URL(process.env.REVOLUT_API_URL?.trim() ||
      `https://${(explicitEnvironment ?? keyEnvironment) === "sandbox" ? "sandbox-merchant" : "merchant"}.revolut.com/api`);
  } catch {
    throw new RevolutError("configuration");
  }
  const environment = base.hostname === "sandbox-merchant.revolut.com" ? "sandbox" : "production";
  const path = base.pathname.replace(/\/+$/, "");
  if (base.protocol !== "https:" || base.username || base.password || base.port || base.search || base.hash ||
    !["merchant.revolut.com", "sandbox-merchant.revolut.com"].includes(base.hostname) ||
    !["/api", "/api/1.0"].includes(path) ||
    (explicitEnvironment && explicitEnvironment !== environment) ||
    (keyEnvironment && keyEnvironment !== environment)) {
    throw new RevolutError("configuration");
  }
  return { secretKey, apiUrl: `${base.origin}${path}` };
}

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
  amount: number;
  currency: string;
  outstanding_amount?: number;
  refunded_amount?: number;
  metadata?: Record<string, string>;
  merchant_order_data?: { reference?: string };
}

export function isRevolutOrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID.test(value);
}

export function isTrustedRevolutCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["checkout.revolut.com", "sandbox-checkout.revolut.com"].includes(url.hostname) &&
      url.pathname.startsWith("/payment-link/") && url.pathname.length > "/payment-link/".length;
  } catch {
    return false;
  }
}

function parseOrder(value: unknown, options: { expectedId?: string; requireCheckout?: boolean } = {}): RevolutOrder {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RevolutError("response");
  const data = value as Record<string, unknown>;
  const state = typeof data.state === "string" ? data.state.toLowerCase() : "";
  if (!isRevolutOrderId(data.id) || (options.expectedId && data.id !== options.expectedId) ||
    !ORDER_STATES.has(state) || !Number.isSafeInteger(data.amount) || (data.amount as number) < 0 ||
    typeof data.currency !== "string" || !/^[A-Z]{3}$/.test(data.currency)) {
    throw new RevolutError("response");
  }
  const checkoutUrl = data.checkout_url;
  if ((options.requireCheckout || checkoutUrl !== undefined) && !isTrustedRevolutCheckoutUrl(checkoutUrl)) {
    throw new RevolutError("response");
  }
  for (const field of ["outstanding_amount", "refunded_amount"] as const) {
    if (data[field] !== undefined && (!Number.isSafeInteger(data[field]) || (data[field] as number) < 0)) {
      throw new RevolutError("response");
    }
  }
  const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
    ? Object.fromEntries(Object.entries(data.metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : undefined;
  const merchantOrderData = data.merchant_order_data && typeof data.merchant_order_data === "object"
    ? data.merchant_order_data as Record<string, unknown> : undefined;
  return {
    id: data.id,
    token: typeof data.token === "string" ? data.token : typeof data.public_id === "string" ? data.public_id : "",
    checkout_url: typeof checkoutUrl === "string" ? checkoutUrl : "",
    state,
    amount: data.amount as number,
    currency: data.currency,
    outstanding_amount: data.outstanding_amount as number | undefined,
    refunded_amount: data.refunded_amount as number | undefined,
    metadata,
    merchant_order_data: typeof merchantOrderData?.reference === "string" ? { reference: merchantOrderData.reference } : undefined,
  };
}

async function providerRequest(path: string, init: RequestInit = {}) {
  const { apiUrl, secretKey } = configuration();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Revolut-Api-Version": API_VERSION,
        ...init.headers,
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new RevolutError("request");
  }
  if (!response.ok) throw new RevolutError("request", response.status);
  return response;
}

async function readOrder(response: Response, options: { expectedId?: string; requireCheckout?: boolean } = {}) {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RevolutError("response");
  }
  return parseOrder(body, options);
}

export async function createRevolutOrder(params: CreateOrderParams, idempotencyKey?: string): Promise<RevolutOrder> {
  if (!Number.isSafeInteger(params.amountCents) || params.amountCents < 100 || params.amountCents > 100_000_000 ||
    (params.currency ?? "GBP") !== "GBP" || !isRevolutOrderId(params.quoteId) ||
    !params.description.trim() || params.description.length > 1_000 || /[\r\n]/.test(params.customerEmail) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.customerEmail) || params.customerEmail.length > 254 ||
    (idempotencyKey !== undefined && !/^[a-z\d_./:-]{1,128}$/i.test(idempotencyKey))) {
    throw new RevolutError("input");
  }
  const redirectUrl = params.redirectUrl ?? `${siteConfig.url}/booking/success?quote=${params.quoteId}`;
  try {
    const parsed = new URL(redirectUrl);
    const configured = new URL(siteConfig.url);
    if (parsed.origin !== configured.origin || parsed.username || parsed.password ||
      (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && parsed.protocol === "http:"))) {
      throw new Error();
    }
  } catch {
    throw new RevolutError("input");
  }
  const response = await providerRequest("/orders", {
    method: "POST",
    // The caller must still persist and reuse its order under a database lock:
    // order creation does not document an Idempotency-Key header or guarantee.
    body: JSON.stringify({
      amount: params.amountCents,
      currency: "GBP",
      description: params.description,
      customer: { email: params.customerEmail },
      capture_mode: "automatic",
      expire_pending_after: "P30D",
      merchant_order_data: { reference: `GC-${params.quoteId}` },
      metadata: { service: "goodycleaning", cleaningQuoteId: params.quoteId },
      redirect_url: redirectUrl,
    }),
  });
  const order = await readOrder(response, { requireCheckout: true });
  if (order.amount !== params.amountCents || order.currency !== "GBP" || order.state !== "pending") {
    throw new RevolutError("verification");
  }
  return order;
}

export async function getRevolutOrder(id: string): Promise<RevolutOrder> {
  if (!isRevolutOrderId(id)) throw new RevolutError("input");
  return readOrder(await providerRequest(`/orders/${encodeURIComponent(id)}`), { expectedId: id });
}

export async function cancelRevolutOrder(id: string): Promise<RevolutOrder> {
  const order = await getRevolutOrder(id);
  if (["cancelled", "failed", "expired"].includes(order.state)) return order;
  if (order.state !== "pending") throw new RevolutError("verification");
  await providerRequest(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  // A successful cancellation response alone must not expose an earlier payable link.
  const cancelled = await getRevolutOrder(id);
  if (cancelled.state !== "cancelled") throw new RevolutError("verification");
  return cancelled;
}

export function verifyRevolutWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): boolean {
  const secret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (!secret || !signatureHeader || !timestampHeader) return false;
  if (!/^\d+$/.test(timestampHeader)) return false;
  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", secret).update(`v1.${timestampHeader}.${payload}`).digest("hex");
  return signatureHeader.split(",").some((signature) => {
    const match = /^v1=([a-f\d]{64})$/i.exec(signature.trim());
    return Boolean(match && crypto.timingSafeEqual(Buffer.from(match[1], "hex"), Buffer.from(expected, "hex")));
  });
}

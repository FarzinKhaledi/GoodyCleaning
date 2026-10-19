import { z } from "zod";
import type { EnquiryFormData } from "@/lib/validations";
import { PROPERTY_SIZE_LABELS, SERVICE_LABELS } from "@/lib/pricing";

const RECIPIENT = "support@goodyvan.com";
const REQUEST_TIMEOUT_MS = 5_000;

export class EnquiryDeliveryError extends Error {
  constructor(public readonly reason: "configuration" | "token" | "send") {
    super("Enquiry delivery is unavailable");
    this.name = "EnquiryDeliveryError";
  }
}

export async function sendEnquiryEmail(enquiry: EnquiryFormData): Promise<void> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const sender = (process.env.GMAIL_SENDER || process.env.GMAIL_USER || "").trim();

  if (!clientId || !clientSecret || !refreshToken || !z.email().safeParse(sender).success) {
    throw new EnquiryDeliveryError("configuration");
  }
  if (!z.email().safeParse(enquiry.email).success) {
    throw new EnquiryDeliveryError("send");
  }

  let accessToken: string;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new EnquiryDeliveryError("token");
    const token: unknown = await response.json();
    if (!token || typeof token !== "object" || !("access_token" in token) ||
      typeof token.access_token !== "string" || !token.access_token.trim()) {
      throw new EnquiryDeliveryError("token");
    }
    accessToken = token.access_token;
  } catch {
    // Provider bodies and exception messages may contain secrets. Never surface them.
    throw new EnquiryDeliveryError("token");
  }

  const body = [
    "New GoodyCleaning enquiry",
    "",
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone}`,
    `Service: ${SERVICE_LABELS[enquiry.serviceType]}`,
    `Property size: ${PROPERTY_SIZE_LABELS[enquiry.propertySize]}`,
    `Postcode: ${enquiry.postcode || "Not supplied"}`,
    `Preferred date: ${enquiry.preferredDate || "Not supplied"}`,
    "",
    "Additional details:",
    enquiry.message || "Not supplied",
  ].join("\r\n");
  const encodedBody = Buffer.from(body, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
  const subject = Buffer.from("New GoodyCleaning enquiry", "utf8").toString("base64");
  const mime = [
    `From: GoodyCleaning <${sender}>`,
    `To: ${RECIPIENT}`,
    `Reply-To: ${enquiry.email}`,
    `Subject: =?UTF-8?B?${subject}?=`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody,
  ].join("\r\n");

  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new EnquiryDeliveryError("send");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("id" in result) ||
      typeof result.id !== "string" || !result.id.trim()) {
      throw new EnquiryDeliveryError("send");
    }
  } catch {
    throw new EnquiryDeliveryError("send");
  }
}

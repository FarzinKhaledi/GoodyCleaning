import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { EnquiryFormData } from "@/lib/validations";
import {
  buildAdminEnquiryEmail,
  buildCustomerAcknowledgementEmail,
} from "./enquiry-templates";

const SUPPORT_ADDRESS = "support@goodyvan.com";
const REQUEST_TIMEOUT_MS = 5_000;

export class EnquiryDeliveryError extends Error {
  constructor(public readonly reason: "configuration" | "token" | "send") {
    super("Enquiry delivery is unavailable");
    this.name = "EnquiryDeliveryError";
  }
}

function foldedBase64(value: string | Buffer) {
  return Buffer.from(value).toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function encodedSubject(subject: string) {
  const words: string[] = [];
  let chunk = "";
  for (const character of subject) {
    if (Buffer.byteLength(chunk + character, "utf8") > 42) {
      words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`);
  return words.join("\r\n ");
}

function createMime({
  to, replyTo, email, logo, autoSubmitted,
}: {
  to: string;
  replyTo: string;
  email: { subject: string; text: string; html: string };
  logo: Buffer;
  autoSubmitted: "auto-generated" | "auto-replied";
}) {
  const related = `related_${randomUUID()}`;
  const alternative = `alternative_${randomUUID()}`;
  return [
    `From: GoodyCleaning <${SUPPORT_ADDRESS}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodedSubject(email.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Auto-Submitted: ${autoSubmitted}`,
    "X-Auto-Response-Suppress: All",
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${related}"; type="multipart/alternative"`,
    "",
    `--${related}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
    `--${alternative}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    foldedBase64(email.text),
    `--${alternative}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    foldedBase64(email.html),
    `--${alternative}--`,
    `--${related}`,
    'Content-Type: image/png; name="goodycleaning-logo.png"',
    "Content-Transfer-Encoding: base64",
    "Content-ID: <goodycleaning-logo>",
    'Content-Disposition: inline; filename="goodycleaning-logo.png"',
    "",
    foldedBase64(logo),
    `--${related}--`,
    "",
  ].join("\r\n");
}

async function sendMessage(accessToken: string, mime: string) {
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
    // Provider responses and exception messages can contain sensitive data.
    throw new EnquiryDeliveryError("send");
  }
}

export async function sendEnquiryEmail(enquiry: EnquiryFormData): Promise<{ acknowledgementSent: boolean }> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const sender = (process.env.GMAIL_SENDER || process.env.GMAIL_USER || "").trim();

  if (!clientId || !clientSecret || !refreshToken ||
    sender.toLowerCase() !== SUPPORT_ADDRESS || !z.email().safeParse(sender).success) {
    throw new EnquiryDeliveryError("configuration");
  }
  if (!z.email().safeParse(enquiry.email).success) throw new EnquiryDeliveryError("send");

  let adminMime: string;
  let customerMime: string;
  try {
    // Literal path is traced into the serverless deployment by Next.js.
    const logo = await readFile(join(process.cwd(), "src/lib/mail/assets/goodycleaning-logo.png"));
    if (!logo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new EnquiryDeliveryError("configuration");
    }
    adminMime = createMime({
      to: SUPPORT_ADDRESS,
      replyTo: enquiry.email,
      email: buildAdminEnquiryEmail(enquiry),
      logo,
      autoSubmitted: "auto-generated",
    });
    customerMime = createMime({
      to: enquiry.email,
      replyTo: SUPPORT_ADDRESS,
      email: buildCustomerAcknowledgementEmail(enquiry),
      logo,
      autoSubmitted: "auto-replied",
    });
  } catch {
    throw new EnquiryDeliveryError("configuration");
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
    throw new EnquiryDeliveryError("token");
  }

  await sendMessage(accessToken, adminMime);
  try {
    await sendMessage(accessToken, customerMime);
    return { acknowledgementSent: true };
  } catch {
    // The enquiry was accepted. Returning an error here would invite duplicate submissions.
    console.warn("[enquiries] Customer acknowledgement could not be sent.");
    return { acknowledgementSent: false };
  }
}

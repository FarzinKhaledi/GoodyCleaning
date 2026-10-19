import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enquirySchema } from "@/lib/validations";
import { EnquiryDeliveryError, sendEnquiryEmail } from "@/lib/mail/enquiry";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_CLIENTS = 1_000;
const clients = new Map<string, { attempts: number; resetsAt: number }>();

function limitAttempts(request: Request) {
  const now = Date.now();
  const address = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().slice(0, 128);
  const key = createHash("sha256").update(address).digest("hex");
  let client = clients.get(key);
  if (!client || client.resetsAt <= now) {
    if (clients.size >= MAX_CLIENTS) {
      for (const [entry, value] of clients) {
        if (value.resetsAt <= now) clients.delete(entry);
      }
      if (clients.size >= MAX_CLIENTS && !clients.has(key)) return 60;
    }
    client = { attempts: 0, resetsAt: now + WINDOW_MS };
    clients.set(key, client);
  }
  if (client.attempts >= MAX_ATTEMPTS) return Math.max(1, Math.ceil((client.resetsAt - now) / 1000));
  client.attempts += 1;
  return 0;
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return { body: null, tooLarge: false };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { body: null, tooLarge: true };
      }
      chunks.push(value);
    }
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))), tooLarge: false };
  } catch {
    return { body: null, tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This enquiry must be sent from this website." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Please send your enquiry as JSON." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Your enquiry is too large. Please shorten your message." }, { status: 413 });
  }

  const { body, tooLarge } = await readBody(request);
  if (tooLarge) {
    return NextResponse.json({ error: "Your enquiry is too large. Please shorten your message." }, { status: 413 });
  }
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Please check your details and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }, { status: 400 });
  }

  // This is a bounded per-instance burst guard; hosting-level limits can supplement it.
  const retryAfter = limitAttempts(request);
  if (retryAfter) {
    return NextResponse.json({ error: "Please wait a minute before sending another enquiry." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  try {
    await sendEnquiryEmail(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      error: "We couldn’t send your enquiry. Please try again in a moment or call 0800 001 6171.",
    }, { status: error instanceof EnquiryDeliveryError && error.reason === "configuration" ? 503 : 502 });
  }
}

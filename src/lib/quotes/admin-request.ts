import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { QuoteWorkflowError } from "./workflow";
import { RevolutError } from "@/lib/revolut";

export async function validateAdminRequest(request: Request, id: string) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to manage quotes." }, { status: 401 });
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid quote ID." }, { status: 400 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Please use this admin dashboard." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Please send JSON." }, { status: 415 });
  }
  return null;
}

export async function readAdminBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new QuoteWorkflowError(400, "Missing quote details.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 32_768) { await reader.cancel(); throw new QuoteWorkflowError(413, "Quote details are too long."); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new QuoteWorkflowError(400, "Invalid JSON."); }
}

export function quoteErrorResponse(error: unknown) {
  if (error instanceof QuoteWorkflowError) return NextResponse.json({ error: error.message, ...(error.quote ? { quote: error.quote } : {}) }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Check the quote details." }, { status: 400 });
  if (error instanceof RevolutError) return NextResponse.json({
    error: error.reason === "configuration" ? "Revolut payments are not configured. Your draft has been kept." : "Revolut could not confirm this payment link. Your draft has been kept; please try again.",
  }, { status: error.reason === "configuration" ? 503 : 502 });
  console.error("[quotes] Admin quote action unavailable.");
  return NextResponse.json({ error: "The quote action could not be completed. Please try again." }, { status: 503 });
}

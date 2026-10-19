import { NextResponse } from "next/server";
import { validateAdminRequest, readAdminBody, quoteErrorResponse } from "@/lib/quotes/admin-request";
import { quoteVersionSchema } from "@/lib/quotes/pricing";
import { quoteWorkflow } from "@/lib/quotes/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invalid = await validateAdminRequest(request, id);
    if (invalid) return invalid;
    const { version } = quoteVersionSchema.parse(await readAdminBody(request));
    return NextResponse.json(await quoteWorkflow.send(id, version));
  } catch (error) { return quoteErrorResponse(error); }
}

import { NextResponse } from "next/server";
import { validateAdminRequest, readAdminBody, quoteErrorResponse } from "@/lib/quotes/admin-request";
import { quoteDraftSchema } from "@/lib/quotes/pricing";
import { quoteWorkflow } from "@/lib/quotes/workflow";

export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invalid = await validateAdminRequest(request, id);
    if (invalid) return invalid;
    const input = quoteDraftSchema.parse(await readAdminBody(request));
    return NextResponse.json({ quote: await quoteWorkflow.save(id, input) });
  } catch (error) { return quoteErrorResponse(error); }
}

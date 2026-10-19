import { z } from "zod";

export const quoteLineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe each quote item").max(200),
  quantity: z.number().int().min(1).max(100),
  unitPriceCents: z.number().int().min(0).max(10_000_000),
}).strict();

export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;

export function calculateQuoteTotal(items: QuoteLineItem[], discountCents: number): number {
  const parsed = z.array(quoteLineItemSchema).min(1).max(20).parse(items);
  if (!Number.isSafeInteger(discountCents) || discountCents < 0) {
    throw new Error("Discount must be a whole number of pence");
  }
  const subtotal = parsed.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0);
  const total = subtotal - discountCents;
  if (!Number.isSafeInteger(total) || total < 100 || total > 10_000_000) {
    throw new Error("Quote total must be between £1 and £100,000");
  }
  return total;
}

export const quoteVersionSchema = z.object({ version: z.number().int().min(0) }).strict();
export const quoteDraftSchema = z.object({
  version: z.number().int().min(0),
  lineItems: z.array(quoteLineItemSchema).min(1).max(20),
  discountCents: z.number().int().min(0).max(10_000_000),
  customerNotes: z.string().trim().max(5000).nullable(),
  internalNotes: z.string().trim().max(5000).nullable(),
}).strict().superRefine((draft, context) => {
  try { calculateQuoteTotal(draft.lineItems, draft.discountCents); }
  catch { context.addIssue({ code: "custom", message: "Quote total must be between £1 and £100,000 after discount", path: ["lineItems"] }); }
});

import { z } from "zod";
import { enquirySchema } from "@/lib/validations";

export const quoteLineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe each quote item").max(200),
  quantity: z.number().int().min(1).max(100),
  unitPriceCents: z.number().int().min(0).max(10_000_000),
}).strict();

export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;
export type QuoteDiscountType = "fixed" | "percentage";
export type QuoteDiscount =
  | { discountType: "fixed"; discountCents: number }
  | { discountType: "percentage"; discountBasisPoints: number };

const centsSchema = z.number().int().min(0).max(10_000_000);
const basisPointsSchema = z.number().int().min(0).max(10_000);
const discountSchema = z.discriminatedUnion("discountType", [
  z.object({ discountType: z.literal("fixed"), discountCents: centsSchema }),
  z.object({ discountType: z.literal("percentage"), discountBasisPoints: basisPointsSchema }),
]);

/** All monetary results are whole pence. One basis point is 0.01%. */
export function calculateQuotePricing(items: QuoteLineItem[], discount: QuoteDiscount) {
  const parsed = z.array(quoteLineItemSchema).min(1).max(20).parse(items);
  const approvedDiscount = discountSchema.parse(discount);
  const subtotalCents = parsed.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0);
  // Item bounds keep this integer product below Number.MAX_SAFE_INTEGER.
  const discountCents = approvedDiscount.discountType === "percentage"
    ? Math.round(subtotalCents * approvedDiscount.discountBasisPoints / 10_000)
    : approvedDiscount.discountCents;
  const totalCents = subtotalCents - discountCents;
  if (!Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > 10_000_000 ||
    !Number.isSafeInteger(totalCents) || totalCents < 100 || totalCents > 10_000_000) {
    throw new Error("Quote total must be between £1 and £100,000 after discount");
  }
  return { subtotalCents, discountCents, totalCents };
}

/** Compatibility helper for existing callers and fixed-discount quotes. */
export function calculateQuoteTotal(items: QuoteLineItem[], discountCents: number): number {
  return calculateQuotePricing(items, { discountType: "fixed", discountCents }).totalCents;
}

export function getQuoteDiscount(input: {
  discountType?: QuoteDiscountType;
  discountCents?: number;
  discountBasisPoints?: number | null;
}): QuoteDiscount {
  return discountSchema.parse(input.discountType === "percentage"
    ? { discountType: "percentage", discountBasisPoints: input.discountBasisPoints }
    : { discountType: "fixed", discountCents: input.discountCents });
}

function isCalendarDate(value: string) {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Admins can retain historical request dates; public enquiries still require today onwards.
export const quoteCustomerDetailsSchema = z.object({
  name: enquirySchema.shape.name,
  email: enquirySchema.shape.email,
  phone: enquirySchema.shape.phone,
  serviceType: enquirySchema.shape.serviceType,
  propertySize: enquirySchema.shape.propertySize,
  postcode: z.string().trim().max(12, "Please enter a valid postcode").nullable().optional(),
  preferredDate: z.string().refine(isCalendarDate, "Please enter a valid date").nullable().optional(),
  message: z.string().trim().max(5000, "Please keep the enquiry message under 5,000 characters").nullable().optional(),
}).strict();

export type QuoteCustomerDetails = z.infer<typeof quoteCustomerDetailsSchema>;
export const quoteVersionSchema = z.object({ version: z.number().int().min(0) }).strict();
export const quoteDraftSchema = z.object({
  version: z.number().int().min(0),
  lineItems: z.array(quoteLineItemSchema).min(1).max(20).optional(),
  discountType: z.enum(["fixed", "percentage"]).optional(),
  discountCents: centsSchema.optional(),
  discountBasisPoints: basisPointsSchema.nullable().optional(),
  customerNotes: z.string().trim().max(5000).nullable().optional(),
  internalNotes: z.string().trim().max(5000).nullable().optional(),
  ...quoteCustomerDetailsSchema.partial().shape,
}).strict().superRefine((draft, context) => {
  if (Object.keys(draft).every((field) => field === "version")) {
    context.addIssue({ code: "custom", message: "Include the details you want to update" });
  }
  if (draft.discountType !== "percentage" && draft.discountBasisPoints != null) {
    context.addIssue({ code: "custom", message: "A fixed discount cannot include a percentage", path: ["discountBasisPoints"] });
  }
  if (draft.discountType === "percentage" && draft.discountBasisPoints == null) {
    context.addIssue({ code: "custom", message: "Enter the discount percentage", path: ["discountBasisPoints"] });
  }
  // An explicit complete price is checked here; partial pricing is checked against the locked record.
  if (draft.lineItems && (draft.discountCents !== undefined || draft.discountType === "percentage")) {
    try { calculateQuotePricing(draft.lineItems, getQuoteDiscount(draft)); }
    catch { context.addIssue({ code: "custom", message: "Enter a valid discount and a quote total between £1 and £100,000", path: ["lineItems"] }); }
  }
});

export type QuoteDraftInput = z.input<typeof quoteDraftSchema>;

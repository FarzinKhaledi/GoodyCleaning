import { z } from "zod";

export function getBookingMinDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isValidBookingDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return false;
  }

  return value >= getBookingMinDate();
}

export const bookingSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Please enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]+$/, "Please enter a valid phone number")
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 10 && digits <= 15;
    }, "Please enter a valid phone number"),
  serviceType: z.enum(["carpet", "deep", "tenancy"]),
  propertySize: z.enum([
    "studio",
    "1bed",
    "2bed",
    "3bed",
    "4bed",
    "commercial",
  ]),
  preferredDate: z
    .string()
    .refine(isValidBookingDate, "Please choose a valid date from today onwards")
    .optional(),
  message: z.string().trim().max(5000, "Please keep your message under 5,000 characters").optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const enquirySchema = bookingSchema.extend({
  phone: bookingSchema.shape.phone.max(40, "Please enter a valid phone number"),
  postcode: z.string().trim().max(12, "Please enter a valid postcode").optional(),
  website: z.string().max(0, "Unable to submit this enquiry").optional(),
});

export type EnquiryFormData = z.infer<typeof enquirySchema>;

export const quotePriceSchema = z.object({
  priceCents: z.coerce.number().int("Price must be in whole pence").min(100, "Price must be at least £1").max(2147483647),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

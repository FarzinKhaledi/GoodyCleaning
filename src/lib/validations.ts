import { z } from "zod";

export const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  serviceType: z.enum(["carpet", "deep", "tenancy"]),
  propertySize: z.enum([
    "studio",
    "1bed",
    "2bed",
    "3bed",
    "4bed",
    "commercial",
  ]),
  preferredDate: z.string().optional(),
  message: z.string().optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const quotePriceSchema = z.object({
  priceCents: z.coerce.number().min(100, "Price must be at least £1"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

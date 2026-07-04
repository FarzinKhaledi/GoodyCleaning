import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import type { Testimonial } from "@/lib/db/schema";

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Sarah M.",
    rating: 5,
    message:
      "Absolutely spotless! The end of tenancy clean saved our deposit. Professional, punctual, and thorough.",
    published: true,
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "James T.",
    rating: 5,
    message:
      "Our carpets look brand new. The team was friendly and the eco-friendly products smelled fresh, not chemical.",
    published: true,
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "Emma L.",
    rating: 5,
    message:
      "Best deep clean we've ever had. Every corner was addressed. Will definitely book again.",
    published: true,
    createdAt: new Date(),
  },
  {
    id: "4",
    name: "David R.",
    rating: 5,
    message:
      "Competitive pricing and outstanding results. They handled our 2-bed flat in under 4 hours.",
    published: true,
    createdAt: new Date(),
  },
  {
    id: "5",
    name: "Priya K.",
    rating: 5,
    message:
      "Used Goodycleaning for our office. Minimal disruption, excellent communication throughout.",
    published: true,
    createdAt: new Date(),
  },
  {
    id: "6",
    name: "Michael B.",
    rating: 5,
    message:
      "From booking to completion, everything was seamless. Highly recommend!",
    published: true,
    createdAt: new Date(),
  },
];

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!db) return FALLBACK_TESTIMONIALS;

  try {
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.published, true));

    return results.length > 0 ? results : FALLBACK_TESTIMONIALS;
  } catch {
    return FALLBACK_TESTIMONIALS;
  }
}

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

// The seed script inserts these same examples into the database.
const exampleReviewKeys = new Set(
  FALLBACK_TESTIMONIALS.map((review) => `${review.name}\0${review.message}`),
);

export interface TestimonialContent {
  testimonials: Testimonial[];
  isExample: boolean;
}

export async function getTestimonialContent(): Promise<TestimonialContent> {
  if (!db) {
    return { testimonials: FALLBACK_TESTIMONIALS, isExample: true };
  }

  try {
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.published, true));

    const customerReviews = results.filter(
      (review) => !exampleReviewKeys.has(`${review.name}\0${review.message}`),
    );

    return customerReviews.length > 0
      ? { testimonials: customerReviews, isExample: false }
      : { testimonials: FALLBACK_TESTIMONIALS, isExample: true };
  } catch {
    return { testimonials: FALLBACK_TESTIMONIALS, isExample: true };
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const content = await getTestimonialContent();
  return content.testimonials;
}

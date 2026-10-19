import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";
import type { Testimonial } from "@/lib/db/schema";

// Exclude examples inserted by earlier versions of the seed script.
const historicalSeedReviews = [
  ["Sarah M.", "Absolutely spotless! The end of tenancy clean saved our deposit. Professional, punctual, and thorough."],
  ["James T.", "Our carpets look brand new. The team was friendly and the eco-friendly products smelled fresh, not chemical."],
  ["Emma L.", "Best deep clean we've ever had. Every corner was addressed. Will definitely book again."],
  ["David R.", "Competitive pricing and outstanding results. They handled our 2-bed flat in under 4 hours."],
  ["Priya K.", "Used Goodycleaning for our office. Minimal disruption, excellent communication throughout."],
  ["Michael B.", "From booking to completion, everything was seamless. Highly recommend!"],
] as const;

const exampleReviewKeys = new Set(
  historicalSeedReviews.map(([name, message]) => `${name}\0${message}`),
);

export interface TestimonialContent {
  testimonials: Testimonial[];
  isExample: boolean;
}

export async function getTestimonialContent(): Promise<TestimonialContent> {
  if (!db) {
    return { testimonials: [], isExample: false };
  }

  try {
    const results = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.published, true));

    const customerReviews = results.filter(
      (review) =>
        review.name.trim().length > 0 &&
        review.message.trim().length > 0 &&
        Number.isInteger(review.rating) &&
        review.rating >= 1 &&
        review.rating <= 5 &&
        !exampleReviewKeys.has(`${review.name}\0${review.message}`),
    );

    return { testimonials: customerReviews, isExample: false };
  } catch {
    return { testimonials: [], isExample: false };
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const content = await getTestimonialContent();
  return content.testimonials;
}

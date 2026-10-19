"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react";
import type { Testimonial } from "@/lib/db/schema";

interface TestimonialsProps {
  testimonials: Testimonial[];
  isExample?: boolean;
}

export function Testimonials({ testimonials, isExample = true }: TestimonialsProps) {
  const [page, setPage] = useState(0);

  if (testimonials.length === 0) return null;

  const pageSize = 3;
  const pageCount = Math.ceil(testimonials.length / pageSize);
  const currentPage = page % pageCount;
  const visibleTestimonials = testimonials.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  return (
    <section id="testimonials" className="section-pad scroll-mt-24">
      <div className="section-shell">
        <div
          data-reveal
          className="mb-10 flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end"
        >
          <div>
            <span className="eyebrow">
              {isExample ? "A glimpse of the Goody experience" : "The good word"}
            </span>
            <h2 className="section-heading mt-4 max-w-2xl text-[#102c43]">
              {isExample ? "Fresh spaces. Happy stories." : "A little love for a lovely clean."}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#102c43]/65">
              {isExample
                ? "Example customer stories to show the kinds of cleans we offer."
                : "Small details, fresh starts, and the difference a good clean makes."}
            </p>
          </div>

          {pageCount > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => (value - 1 + pageCount) % pageCount)}
                aria-label="Show previous customer stories"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#102c43]/15 text-[#102c43] transition-colors hover:border-[#2457e8] hover:bg-[#2457e8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2457e8]"
              >
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => (value + 1) % pageCount)}
                aria-label="Show next customer stories"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#102c43]/15 text-[#102c43] transition-colors hover:border-[#2457e8] hover:bg-[#2457e8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2457e8]"
              >
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div data-reveal>
          <div className="grid gap-5 md:grid-cols-3" aria-live="polite" aria-atomic="true">
            {visibleTestimonials.map((testimonial, index) => (
              <figure
                key={testimonial.id}
                className={`flex min-h-[315px] flex-col rounded-[1.5rem] p-7 transition-shadow duration-300 hover:shadow-[0_12px_40px_-20px_rgba(16,44,67,0.2)] lg:p-8 ${
                  index === 1
                    ? "border border-[#d6f28b] bg-[#eaf4d6]"
                    : "border border-[#102c43]/8 bg-white"
                }`}
              >
                <div className="mb-7 flex items-center justify-between">
                  <span className="flex gap-1" aria-label={`${testimonial.rating} out of 5 stars`}>
                    {Array.from({ length: Math.max(0, Math.min(5, Math.round(testimonial.rating))) }).map((_, i) => (
                      <Star key={i} aria-hidden="true" className="h-3.5 w-3.5 fill-[#2457e8] text-[#2457e8]" />
                    ))}
                  </span>
                  <Quote aria-hidden="true" className="h-6 w-6 text-[#102c43]/20" strokeWidth={1.5} />
                </div>
                <blockquote className="flex-1 text-[17px] leading-[1.75] font-medium tracking-[-0.015em] text-[#102c43]">
                  &ldquo;{testimonial.message}&rdquo;
                </blockquote>
                <figcaption className="mt-7 flex items-center justify-between gap-3 border-t border-[#102c43]/10 pt-5">
                  <span className="text-sm font-semibold text-[#102c43]">{testimonial.name}</span>
                  <span className="text-xs text-[#102c43]/50">
                    {isExample ? "Example review" : "Customer review"}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-7 flex items-center justify-center gap-2">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show customer stories page ${index + 1}`}
                  aria-current={currentPage === index ? "true" : undefined}
                  onClick={() => setPage(index)}
                  className="flex h-7 min-w-7 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2457e8]"
                >
                  <span className={`h-1.5 rounded-full transition-all ${
                    currentPage === index ? "w-7 bg-[#2457e8]" : "w-1.5 bg-[#102c43]/20"
                  }`} />
                </button>
              ))}
              <span className="sr-only">Page {currentPage + 1} of {pageCount}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

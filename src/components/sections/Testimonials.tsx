"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Testimonial } from "@/lib/db/schema";

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (testimonials.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  const prev = () =>
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  const t = testimonials[current];

  return (
    <section id="testimonials" className="relative px-6 py-32">
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            What Our Clients Say
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Real reviews from real customers
          </p>
        </div>

        <div
          className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12"
          aria-live="polite"
        >
          <div className="mb-4 flex gap-1">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-mint text-mint" />
            ))}
          </div>
          <blockquote className="mb-6 text-xl text-white/90 md:text-2xl">
            &ldquo;{t.message}&rdquo;
          </blockquote>
          <p className="font-semibold text-mint">{t.name}</p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={prev} aria-label="Previous review">
              <ChevronLeft className="h-5 w-5 text-white" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-8 bg-mint" : "w-2 bg-white/30"
                  }`}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={next} aria-label="Next review">
              <ChevronRight className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Accessible list fallback */}
        <ul className="sr-only">
          {testimonials.map((item) => (
            <li key={item.id}>
              {item.name}: {item.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

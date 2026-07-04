"use client";

import { siteConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Hero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div className="relative z-10 mx-auto max-w-4xl space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm text-mint backdrop-blur">
          <Sparkles className="h-4 w-4" />
          Professional Cleaning Services
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
          <span className="bg-linear-to-r from-mint to-white bg-clip-text text-transparent">
            {siteConfig.name}
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-xl text-white/80 sm:text-2xl">
          {siteConfig.tagline}
        </p>

        <p className="mx-auto max-w-xl text-base text-white/60">
          Deep cleaning, end of tenancy, and carpet care — delivered by a
          professional team with eco-friendly products.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" onClick={() => scrollTo("booking")}>
            Book a clean
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => scrollTo("services")}
          >
            See services
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="h-10 w-6 rounded-full border-2 border-white/30 p-1">
            <div className="mx-auto h-2 w-1 animate-pulse rounded-full bg-mint" />
          </div>
        </div>
      </div>
    </section>
  );
}

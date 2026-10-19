"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import { getPrice, PROPERTY_SIZE_LABELS, SERVICE_LABELS, type PropertySize, type ServiceType } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/config";

export function Hero() {
  const [service, setService] = useState<ServiceType>("deep");
  const [propertySize, setPropertySize] = useState<PropertySize>("1bed");
  const price = siteConfig.booking.instantEnabled ? getPrice(service, propertySize) : null;

  function startBooking() {
    window.dispatchEvent(new CustomEvent("select-service", { detail: { service, propertySize } }));
    document.getElementById("booking")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section id="hero" className="hero-section scroll-mt-24">
      <div className="section-shell">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-intro inline-flex items-center gap-2.5 rounded-full border border-[#102c43]/10 px-3.5 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2457e8]" />
              Clean spaces. Good vibes.
            </div>
            <h1 className="hero-title">
              Less cleaning.<br />
              More <span className="hero-living">living.<svg viewBox="0 0 350 20" fill="none" aria-hidden="true"><path d="M5 13C85 1 235 0 344 10" stroke="currentColor" strokeWidth="11" strokeLinecap="round" /></svg></span>
            </h1>
            <p className="hero-description">
              A beautifully clean home. A little time back for you.
              Professional cleaning, thoughtful people, and that
              fresh-start feeling.
            </p>
            <div className="hero-actions flex flex-wrap items-center gap-5">
              <a href="#booking" className="pill-button pill-button-blue group">
                Find your clean <ArrowUpRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </a>
              <a href="#services" className="inline-flex items-center gap-2.5 text-sm font-semibold underline-offset-4 hover:underline">
                Explore services <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="hero-trust flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-medium text-[#516373] sm:text-xs">
              <span className="inline-flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-[#2457e8]" aria-hidden="true" /> Care for your space</span>
              <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[#2457e8]" aria-hidden="true" /> Friendly, direct support</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#2457e8]" aria-hidden="true" /> {siteConfig.booking.instantEnabled ? "Clear, upfront prices" : "Quotes for your space"}</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image src="/images/living-room.jpg" alt="A bright, freshly cared-for living room with natural light and green plants" fill sizes="(max-width: 900px) 100vw, 50vw" loading="eager" fetchPriority="high" className="object-cover" />
              <div className="hero-photo-shade" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3 text-white sm:bottom-8 sm:left-8">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 backdrop-blur-sm"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                <span className="text-xs font-medium tracking-wide">Make room for the good stuff.</span>
              </div>
            </div>
            <div className="hero-seal" aria-hidden="true"><Sparkles className="h-9 w-9" strokeWidth={1.4} /><span>A FRESH<br />KIND OF HAPPY</span></div>
            <div className="hero-float">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d6f28b]"><Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /></span>
              <div><p className="text-[13px] font-semibold">Your home, at its happiest.</p><p className="mt-1 text-[11px] text-[#687781]">We&apos;ll take care of the details.</p></div>
              <Sparkles className="ml-2 h-5 w-5 text-[#2457e8]" aria-hidden="true" />
            </div>
            <span className="hero-spark" aria-hidden="true">✳</span>
          </div>
        </div>
        <div className="quick-booking" aria-label="Find a cleaning service">
          <div className="quick-booking-title"><Sparkles className="h-5 w-5 text-[#2457e8]" aria-hidden="true" /><span>A fresh start,<br /><strong>just a few clicks away.</strong></span></div>
          <label className="quick-field"><span>YOUR SERVICE</span><span className="relative"><select aria-label="Your cleaning service" value={service} onChange={e => setService(e.target.value as ServiceType)}>{Object.entries(SERVICE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" /></span></label>
          <label className="quick-field"><span>YOUR SPACE</span><span className="relative"><select aria-label="Your property size" value={propertySize} onChange={e=>setPropertySize(e.target.value as PropertySize)}>{Object.entries(PROPERTY_SIZE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" /></span></label>
          <button className="quick-booking-button group" type="button" onClick={startBooking}><span>{price ? <>Let&apos;s go <span className="font-normal opacity-65">· {formatPrice(price)}</span></> : "Get my quote"}</span><ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="hero-bottom-note"><span>A LITTLE MORE CARE. A WHOLE LOT MORE CLEAN.</span><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></div>
    </section>
  );
}

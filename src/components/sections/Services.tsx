"use client";

import Image from "next/image";
import { ArrowUpRight, Check, Home, Layers, Sparkles } from "lucide-react";
import { getFromPrice, type ServiceType } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/config";

const services = [
  { id: "deep" as ServiceType, title: "Deep cleaning", description: "A proper reset for your space. From busy kitchens to those forgotten corners, we get into the details.", image: "/images/kitchen.jpg", alt: "Spotless bright kitchen with white counters and cabinets", icon: Sparkles, tags: ["Kitchen & bathrooms", "Every little detail"], badge: "THE FULL REFRESH" },
  { id: "tenancy" as ServiceType, title: "End of tenancy", description: "Moving on or settling in? Leave the cleaning to us and start your next chapter with a fresh slate.", image: "/images/fresh-home.jpg", alt: "Fresh modern home with light blue sofas and timber flooring", icon: Home, tags: ["Moving in or out", "Top-to-bottom care"], badge: "NEW CHAPTER ENERGY" },
  { id: "carpet" as ServiceType, title: "Carpet cleaning", description: "Bring the soft back underfoot. A deeper clean to lift dirt, treat stains, and refresh your favourite rooms.", image: "/images/living-room.jpg", alt: "Soft light-coloured rug in a sunlit living room", icon: Layers, tags: ["Deep-set dirt", "Fresh-feeling fibres"], badge: "SOFT. FRESH. LOVELY." },
];

export function Services() {
  function chooseService(service: ServiceType) {
    window.dispatchEvent(new CustomEvent("select-service", { detail: service }));
    document.getElementById("booking")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return (
    <section id="services" className="section-pad scroll-mt-24">
      <div className="section-shell">
        <div data-reveal className="mb-10 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
          <div><span className="eyebrow"><span className="eyebrow-dot" /> A clean for every kind of life</span><h2 className="section-heading mt-5">Your space.<br /><span className="text-[#2457e8]">Our kind of care.</span></h2></div>
          <p className="max-w-[310px] text-sm leading-7 text-[#687781] md:pb-1">Big fresh starts. Little everyday joys. Find the clean that feels right for you.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service,index)=>(
            <article data-reveal key={service.id} className="service-card group" style={{ "--reveal-delay": `${index * 85}ms` } as React.CSSProperties}>
              <div className="service-image"><Image src={service.image} alt={service.alt} fill sizes="(max-width: 767px) 100vw, 33vw" className={`object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-105 ${service.id === "carpet" ? "object-bottom" : ""}`} /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-semibold tracking-[0.09em]">{service.badge}</span><span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#d6f28b]"><service.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span></div>
              <div className="p-6 lg:p-7"><h3 className="text-[25px] font-semibold tracking-[-0.045em]">{service.title}</h3><p className="mt-3 min-h-[78px] text-sm leading-[1.85] text-[#687781]">{service.description}</p><ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">{service.tags.map(tag=><li key={tag} className="flex items-center gap-1.5 text-[10px] font-medium text-[#516373]"><Check className="h-3 w-3 text-[#2457e8]" aria-hidden="true" />{tag}</li>)}</ul><div className="mt-6 flex items-center justify-between border-t border-[#102c43]/10 pt-5">{siteConfig.booking.instantEnabled ? <p className="text-[11px] text-[#687781]">From <strong className="ml-1 text-[24px] font-semibold tracking-[-0.04em] text-[#102c43]">{formatPrice(getFromPrice(service.id))}</strong></p> : <p className="text-sm font-semibold text-[#2457e8]">Get a personalised quote</p>}<button onClick={()=>chooseService(service.id)} type="button" aria-label={`Book ${service.title}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#102c43]/15 transition-colors hover:border-[#2457e8] hover:bg-[#2457e8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2457e8]"><ArrowUpRight className="h-5 w-5" aria-hidden="true" /></button></div></div>
            </article>
          ))}
        </div>
        <p data-reveal className="mt-7 text-center text-xs leading-6 text-[#687781]">A bigger space or something a little different? <a href="#booking" className="font-semibold text-[#2457e8] underline-offset-4 hover:underline">Let&apos;s talk about your clean <span aria-hidden="true">↗</span></a></p>
      </div>
    </section>
  );
}

export { isBigJob } from "@/lib/pricing";

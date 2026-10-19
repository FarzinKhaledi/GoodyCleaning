import { ArrowUpRight, Camera, Mail, MapPin, Phone, Share2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { siteConfig } from "@/lib/config";

const quickLinks = [
  { href: "#services", label: "Our services" },
  { href: "#why-us", label: "The Goody difference" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "Your questions" },
];

export function Footer() {
  return (
    <footer className="overflow-hidden rounded-t-[2.5rem] bg-[#102c43] text-white sm:rounded-t-[3rem]">
      <div className="section-shell">
        <div data-reveal className="flex flex-col items-start justify-between gap-8 border-b border-white/15 py-14 sm:py-16 lg:flex-row lg:items-center">
          <div>
            <span className="eyebrow !text-[#d6f28b]">Good things start with a clean</span>
            <p className="mt-4 max-w-2xl text-[clamp(2.25rem,4.5vw,4.5rem)] leading-[1.08] font-semibold tracking-[-0.055em]">
              A fresher space.<br />A better kind of day.
            </p>
          </div>
          <a
            href="#booking"
            className="group inline-flex shrink-0 items-center gap-7 rounded-full bg-[#d6f28b] py-4 pr-4 pl-7 text-sm font-semibold text-[#102c43] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]"
          >
            Let&apos;s make it shine
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#102c43] text-[#d6f28b]">
              <ArrowUpRight aria-hidden="true" className="h-5 w-5 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
            </span>
          </a>
        </div>

        <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_1fr] lg:gap-20 lg:py-16">
          <div>
            <a href="#hero" aria-label="GoodyCleaning home" className="original-logo footer-original-logo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
              <BrandLogo width={480} height={320} />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/60">
              {siteConfig.tagline} Thoughtful, professional cleaning for your
              home or workspace.
            </p>
            <a
              href={siteConfig.goodyVan.url}
              className="group mt-5 inline-flex max-w-xs items-start gap-3 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80 transition-colors hover:border-[#d6f28b]/50 hover:text-[#d6f28b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]"
            >
              <span>Moving home too?<br /><strong className="font-semibold">Explore moving services with GoodyVan</strong></span>
              <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
            </a>
            <div className="mt-6 flex gap-2">
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="GoodyCleaning on Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-[#d6f28b] hover:text-[#d6f28b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
                <Share2 aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="GoodyCleaning on Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-[#d6f28b] hover:text-[#d6f28b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
                <Camera aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="mb-5 text-xs font-semibold tracking-[0.12em] text-white/45 uppercase">Explore</h2>
            <ul className="space-y-3.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/75 underline-offset-4 transition-colors hover:text-[#d6f28b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-5 text-xs font-semibold tracking-[0.12em] text-white/45 uppercase">Say hello</h2>
            <ul className="space-y-4 text-sm text-white/75">
              <li>
                <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-3 transition-colors hover:text-[#d6f28b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-[#d6f28b]" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="inline-flex items-center gap-3 break-all transition-colors hover:text-[#d6f28b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-[#d6f28b]" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#d6f28b]" />
                {siteConfig.contact.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 py-7 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} GoodyCleaning. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#d6f28b]" />
            A little care goes a long way.
          </p>
        </div>
      </div>
    </footer>
  );
}

import { ArrowUpRight, HeartHandshake, ReceiptText, SlidersHorizontal, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/config";

const benefits = [
  {
    icon: HeartHandshake,
    title: "Good people. Great care.",
    description:
      "A cleaning service shaped around your space and the details that matter to you.",
  },
  {
    icon: SlidersHorizontal,
    title: "A clean that fits.",
    description:
      "Tell us about your priorities and any product preferences, so we can discuss the right clean for your space.",
  },
  {
    icon: Sparkles,
    title: "The details make it.",
    description:
      "From deep-set carpet dirt to busy kitchens, we give those easily missed places attention.",
  },
  {
    icon: ReceiptText,
    title: "Clear prices. Easy choices.",
    description: siteConfig.booking.instantEnabled
      ? "See prices for smaller homes upfront, with a personal quote for larger spaces and offices."
      : "Get a personal quote for your space, with the price and cleaning details agreed before you book.",
  },
];

export function WhyUs() {
  return (
    <section id="why-us" className="section-pad scroll-mt-24">
      <div className="section-shell">
        <div
          data-reveal
          className="relative isolate overflow-hidden rounded-[2rem] bg-[#102c43] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-44 -left-36 h-[26rem] w-[26rem] rounded-full border border-white/5 shadow-[0_0_0_60px_rgba(255,255,255,0.025),0_0_0_120px_rgba(255,255,255,0.02)]"
          />
          <div className="relative grid gap-14 lg:grid-cols-[0.95fr_1.1fr] lg:gap-20">
            <div className="flex flex-col items-start">
              <span className="eyebrow !text-[#d6f28b]">The Goody difference</span>
              <h2 className="mt-6 max-w-md text-[clamp(2.5rem,4.4vw,4.25rem)] leading-[1.08] font-semibold tracking-[-0.055em]">
                A clean home.<br />A clear mind.
                <span className="block text-[#d6f28b]">A little more you.</span>
              </h2>
              <p className="mt-6 max-w-sm text-base leading-7 text-white/65">
                Less time scrubbing. More time for the good stuff. We take care
                of the clean, so you can get on with your day.
              </p>
              <a
                href="#booking"
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[#d6f28b] px-6 py-3.5 text-sm font-semibold text-[#102c43] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6f28b]"
              >
                Find your fresh start
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
              </a>
            </div>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:gap-y-12">
              {benefits.map((benefit, index) => (
                <div key={benefit.title} className="group">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 transition-colors group-hover:border-[#d6f28b]/40 group-hover:bg-[#d6f28b]/10">
                    <benefit.icon aria-hidden="true" className="h-[22px] w-[22px] text-[#d6f28b]" strokeWidth={1.6} />
                  </div>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="text-[10px] font-medium text-white/40">0{index + 1}</span>
                    <h3 className="text-lg leading-snug font-semibold tracking-tight">{benefit.title}</h3>
                  </div>
                  <p className="text-sm leading-6 text-white/60">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

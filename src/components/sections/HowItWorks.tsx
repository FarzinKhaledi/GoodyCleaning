import { CalendarCheck2, Coffee, MousePointer2 } from "lucide-react";
import { siteConfig } from "@/lib/config";

const steps = [
  {
    number: "01",
    icon: MousePointer2,
    title: "Make it your clean.",
    description: siteConfig.booking.instantEnabled
      ? "Choose your service and the size of your space. Get an instant price for a smaller home, or a tailored quote for a bigger job."
      : "Choose your service and the size of your space. Share your postcode, preferred date, and the details that matter to you.",
    colour: "bg-[#d6f28b] text-[#102c43]",
  },
  {
    number: "02",
    icon: CalendarCheck2,
    title: "Leave the details to us.",
    description: siteConfig.booking.instantEnabled
      ? "Book through secure checkout or send a quote request. Tell us your preferred date and our team will confirm the details with you."
      : "Send your enquiry through the form or call our cleaning team. We will confirm the price, availability, and cleaning details with you.",
    colour: "bg-[#2457e8] text-white",
  },
  {
    number: "03",
    icon: Coffee,
    title: "Enjoy that fresh feeling.",
    description:
      "We take care of the cleaning, so you can get on with your day. More time for your favourite things. A lovely space to come back to.",
    colour: "bg-[#e8edf7] text-[#2457e8]",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-shell section-pad scroll-mt-24 text-[#102c43]"
      aria-labelledby="how-it-works-title"
    >
      <div data-reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-5">Less hassle. More happy.</p>
        <h2 id="how-it-works-title" className="section-heading">
          A great clean.<br />
          <span className="text-[#2457e8]">Three simple steps.</span>
        </h2>
      </div>

      <div className="relative mt-14 md:mt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-11 hidden border-t border-dashed border-[#cbd4d6] md:block"
        />
        <ol className="relative grid gap-12 md:grid-cols-3 md:gap-12 lg:gap-20">
          {steps.map(({ number, icon: Icon, title, description, colour }) => (
            <li key={number} data-reveal className="group flex flex-col items-center text-center">
              <div className={`relative flex h-[88px] w-[88px] items-center justify-center rounded-full ${colour} transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none`}>
                <Icon className="h-8 w-8 stroke-[1.6]" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#f7f8f4] bg-[#102c43] text-[10px] font-semibold text-white">
                  {number}
                </span>
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] lg:text-2xl">{title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-[1.8] text-[#687781]">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

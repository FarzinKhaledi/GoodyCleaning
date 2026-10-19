import { ArrowUpRight, Plus } from "lucide-react";
import { siteConfig } from "@/lib/config";

const instantQuestions = [
  {
    question: "Which clean is right for me?",
    answer:
      "Choose carpet cleaning to refresh fibres and treat stains, deep cleaning for a thorough top-to-bottom clean, or before and after tenancy cleaning when moving in or out. Select a service in the booking form to see the price for your property.",
  },
  {
    question: "Can I see a price before I book?",
    answer:
      "Yes. Studios, one-bedroom homes, and two-bedroom homes have instant prices in the booking form. Choose your service and property size to see your price before continuing. Homes with three or more bedrooms and commercial spaces receive a personalised quote.",
  },
  {
    question: "Do you use eco-friendly products?",
    answer:
      "Yes, we use eco-friendly cleaning products. If you have any sensitivities or specific product requirements, add them to the details in your booking request so the team can discuss them with you.",
  },
  {
    question: "Can I choose my cleaning date?",
    answer:
      "You can add your preferred date to the booking form. This is a request, and the team will confirm availability with you. If you have particular access times or other requirements, include them in the additional details.",
  },
  {
    question: "What about a larger home or an office?",
    answer:
      "Select three bedrooms, four or more bedrooms, or commercial / office in the booking form. Tell us a little about the space and what you need, then send your quote request. The team will review it and email you a personalised price.",
  },
];

const enquiryQuestions = [
  {
    question: "Which clean is right for me?",
    answer:
      "Choose carpet cleaning to refresh fibres and treat stains, deep cleaning for a thorough top-to-bottom clean, or before and after tenancy cleaning when moving in or out. Tell the team about your space and they can help you choose.",
  },
  {
    question: "How do I get a quote?",
    answer:
      `Choose your service and property size in the enquiry form, then add any useful details. Select “Email us for a quote” to open a draft in your email app, ready to review and send. You can also call the cleaning team on ${siteConfig.contact.mobile}. The team will confirm your price and cleaning details before you book.`,
  },
  {
    question: "Can I request specific cleaning products?",
    answer:
      "Let us know about any product preferences, allergies, or sensitivities in your enquiry. The team will discuss suitable cleaning products and confirm the details with you.",
  },
  {
    question: "Can I choose my cleaning date?",
    answer:
      "Add your preferred date to your enquiry. This is a request, and the team will confirm availability and agree a date with you. Include any particular access times or other requirements in the additional details.",
  },
  {
    question: "What about a larger home or an office?",
    answer:
      "Select three bedrooms, four or more bedrooms, or commercial / office in the enquiry form. Tell us about the space and what you need, then email your enquiry. The team will review the details and provide a tailored quote.",
  },
];

export function FAQ() {
  const questions = siteConfig.booking.instantEnabled ? instantQuestions : enquiryQuestions;
  return (
    <section id="faq" className="section-pad scroll-mt-24">
      <div className="section-shell grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <div data-reveal>
          <span className="eyebrow">Good to know</span>
          <h2 className="section-heading mt-4 max-w-sm text-[#102c43]">
            A few things,<br />cleared up.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-[#102c43]/65">
            From picking your clean to planning your day, we&apos;re here to make
            it feel simple.
          </p>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="group mt-7 inline-flex items-center gap-3 rounded-sm text-sm font-semibold text-[#2457e8] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2457e8]"
          >
            Have something else in mind?
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div data-reveal className="border-t border-[#102c43]/15">
          {questions.map((item, index) => (
            <details key={item.question} className="group border-b border-[#102c43]/15" name="cleaning-faq" open={index === 0 ? true : undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-base font-semibold tracking-[-0.02em] text-[#102c43] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2457e8] [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#102c43]/5 transition-colors group-open:bg-[#2457e8] group-open:text-white">
                  <Plus aria-hidden="true" className="h-4 w-4 transition-transform duration-200 motion-reduce:transition-none group-open:rotate-45" />
                </span>
              </summary>
              <p className="max-w-xl pr-10 pb-6 text-sm leading-7 text-[#102c43]/65">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

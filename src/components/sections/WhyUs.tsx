import { Leaf, Shield, Star, PoundSterling } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Professional Team",
    description:
      "Fully trained, insured, and background-checked cleaners you can trust in your home.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Products",
    description:
      "Non-toxic, biodegradable cleaning products safe for families, pets, and the planet.",
  },
  {
    icon: Star,
    title: "Satisfaction Guaranteed",
    description:
      "Not happy? We'll re-clean for free within 48 hours. Your satisfaction is our priority.",
  },
  {
    icon: PoundSterling,
    title: "Competitive Pricing",
    description:
      "Transparent pricing with no hidden fees. Instant booking for standard jobs, custom quotes for larger properties.",
  },
];

export function WhyUs() {
  return (
    <section id="why-us" className="relative px-6 py-32">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Why Choose Us
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Trusted by homeowners and landlords across the UK
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur transition-all hover:border-mint/30 hover:bg-white/10"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-mint/20">
                <benefit.icon className="h-8 w-8 text-mint" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">
                {benefit.title}
              </h3>
              <p className="text-sm text-white/60">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

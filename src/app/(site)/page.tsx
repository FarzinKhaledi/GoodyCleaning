import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { PageMotion } from "@/components/providers/PageMotion";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { WhyUs } from "@/components/sections/WhyUs";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { BookingForm } from "@/components/sections/BookingForm";
import { FAQ } from "@/components/sections/FAQ";
import { Footer } from "@/components/sections/Footer";
import { Toaster } from "@/components/ui/use-toast";
import { getTestimonialContent } from "@/lib/data/testimonials";
import atmosphere from "@/components/atmosphere/atmosphere.module.css";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | Less cleaning. More living.` },
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
};

export default async function HomePage() {
  const { testimonials, isExample } = await getTestimonialContent();

  return (
    <div className={`marketing-page ${atmosphere.canvas}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <PageMotion>
        <main id="main-content" tabIndex={-1}>
          <Hero />
          <Services />
          <HowItWorks />
          <WhyUs />
          <Testimonials testimonials={testimonials} isExample={isExample} />
          <BookingForm />
          <FAQ />
        </main>
        <Footer />
      </PageMotion>
      <Toaster />
    </div>
  );
}

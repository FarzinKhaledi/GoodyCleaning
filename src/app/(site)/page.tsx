import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { siteConfig } from "@/lib/config";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Scene3DWrapper } from "@/components/three/Scene3DWrapper";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { WhyUs } from "@/components/sections/WhyUs";
import { Testimonials } from "@/components/sections/Testimonials";
import { BookingForm } from "@/components/sections/BookingForm";
import { Footer } from "@/components/sections/Footer";
import { Toaster } from "@/components/ui/use-toast";
import { getTestimonials } from "@/lib/data/testimonials";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Professional Cleaning Services`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
};

export default async function HomePage() {
  const testimonials = await getTestimonials();

  return (
    <SmoothScroll>
      <Scene3DWrapper />
      <main className="relative">
        <Hero />
        <Services />
        <WhyUs />
        <Testimonials testimonials={testimonials} />
        <BookingForm />
        <Footer />
      </main>
      <Toaster />
    </SmoothScroll>
  );
}

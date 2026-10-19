import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Booking status",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string | string[] }>;
}) {
  const params = await searchParams;
  const quoteId = params.quote;
  const validQuoteId = typeof quoteId === "string" && z.uuid().safeParse(quoteId).success
    ? quoteId
    : null;
  let bookingState: "paid" | "pending" | "unavailable" = "unavailable";

  if (validQuoteId) {
    try {
      const [quote] = await requireDb()
        .select({ status: quotes.status })
        .from(quotes)
        .where(eq(quotes.id, validQuoteId))
        .limit(1);
      if (quote?.status === "paid") bookingState = "paid";
      else if (quote?.status === "quoted") bookingState = "pending";
    } catch (error) {
      console.error("Booking status lookup error:", error);
    }
  }

  const isPaid = bookingState === "paid";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7faf8] px-6 py-16 text-center text-navy">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-mint/30 blur-3xl" />
      <Link href="/" aria-label="GoodyCleaning home" className="relative mb-12">
        <BrandLogo />
      </Link>
      <main className="relative w-full max-w-lg rounded-[2rem] border border-navy/5 bg-white p-8 shadow-xl shadow-navy/5 sm:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mint/25 text-[#157757]">
          {isPaid ? <CheckCircle2 className="h-10 w-10" /> : <Clock3 className="h-10 w-10" />}
        </div>
        <p className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#157757]">
          <Sparkles className="h-3.5 w-3.5" /> A fresh start awaits
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {isPaid
            ? "You’re all booked in."
            : bookingState === "pending"
              ? "Let’s confirm your booking."
              : "Let’s check your booking."}
        </h1>
        <p className="mb-8 leading-relaxed text-navy/65">
          {isPaid
            ? "Your payment is confirmed. We’re looking forward to bringing a little more sparkle to your space. Your booking details will arrive by email."
            : bookingState === "pending"
              ? "We’re waiting for payment confirmation. If you’ve just paid, check again in a moment. Your booking is confirmed once payment has been verified."
              : "We couldn’t confirm a booking from this link. If you’ve just completed checkout, try again in a moment or get in touch with our team for help."}
        </p>
        {!isPaid && validQuoteId && (
          <a href={`/booking/success?quote=${encodeURIComponent(validQuoteId)}`} className="mb-4 inline-flex min-h-11 items-center justify-center rounded-full bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/85">
            Check booking status
          </a>
        )}
        <div>
          <Button asChild size="lg"><Link href="/">Back to home <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <p className="mt-8 border-t border-navy/10 pt-6 text-sm text-navy/60">
          Need a hand? <a className="font-semibold text-navy underline underline-offset-4" href={`mailto:${siteConfig.contact.email}`}>Get in touch</a>
        </p>
      </main>
    </div>
  );
}

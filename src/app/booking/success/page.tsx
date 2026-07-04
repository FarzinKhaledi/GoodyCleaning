import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completePayment } from "@/lib/payments/complete";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; order?: string }>;
}) {
  const params = await searchParams;
  const quoteId = params.quote;

  if (quoteId) {
    try {
      await completePayment(quoteId);
    } catch (error) {
      console.error("Payment completion error:", error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-6 text-center">
      <CheckCircle className="mb-6 h-16 w-16 text-mint" />
      <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
        Booking Confirmed!
      </h1>
      <p className="mb-8 max-w-md text-lg text-white/70">
        Thank you for your payment. A confirmation email has been sent to your
        inbox with all the details.
      </p>
      <Link href="/">
        <Button size="lg">Back to Home</Button>
      </Link>
    </div>
  );
}

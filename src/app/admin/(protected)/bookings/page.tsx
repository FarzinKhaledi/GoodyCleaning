import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { bookings, quotes } from "@/lib/db/schema";
import { formatPrice, formatDate } from "@/lib/utils";
import { SERVICE_LABELS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export default async function BookingsPage() {
  let paidBookings: Array<{
    booking: typeof bookings.$inferSelect;
    quote: typeof quotes.$inferSelect;
  }> = [];

  try {
    const db = requireDb();
    const allBookings = await db
      .select()
      .from(bookings)
      .orderBy(desc(bookings.createdAt));

    for (const booking of allBookings) {
      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.id, booking.quoteId))
        .limit(1);
      if (quote) {
        paidBookings.push({ booking, quote });
      }
    }
  } catch {
    // empty
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-navy">Paid Bookings</h1>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {paidBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      No paid bookings yet
                    </td>
                  </tr>
                ) : (
                  paidBookings.map(({ booking, quote }) => (
                    <tr key={booking.id} className="border-b last:border-0">
                      <td className="px-6 py-4">
                        <p className="font-medium text-navy">{quote.name}</p>
                        <p className="text-sm text-slate-500">{quote.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {SERVICE_LABELS[
                          quote.serviceType as keyof typeof SERVICE_LABELS
                        ] ?? quote.serviceType}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatPrice(booking.amountCents)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {booking.paidAt ? formatDate(booking.paidAt) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

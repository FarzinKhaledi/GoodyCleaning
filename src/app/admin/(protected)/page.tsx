import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import { quotes, bookings } from "@/lib/db/schema";
import { formatPrice, formatDate } from "@/lib/utils";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { signOut } from "@/auth";

const FALLBACK_QUOTES: never[] = [];

async function getQuotes() {
  try {
    const db = requireDb();
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  } catch {
    return FALLBACK_QUOTES;
  }
}

async function getPaidCount() {
  try {
    const db = requireDb();
    const paid = await db
      .select()
      .from(quotes)
      .where(eq(quotes.status, "paid"));
    return paid.length;
  } catch {
    return 0;
  }
}

export default async function AdminDashboard() {
  const allQuotes = await getQuotes();
  const paidCount = await getPaidCount();
  const pendingCount = allQuotes.filter((q) => q.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-navy">Goodycleaning Admin</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm">
                Bookings
              </Button>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Pending Quotes</p>
            <p className="text-3xl font-bold text-navy">{pendingCount}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total Requests</p>
            <p className="text-3xl font-bold text-navy">{allQuotes.length}</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Paid Bookings</p>
            <p className="text-3xl font-bold text-mint">{paidCount}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-navy">Quote Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {allQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No quote requests yet
                    </td>
                  </tr>
                ) : (
                  allQuotes.map((quote) => (
                    <tr key={quote.id} className="border-b last:border-0">
                      <td className="px-6 py-4">
                        <p className="font-medium text-navy">{quote.name}</p>
                        <p className="text-sm text-slate-500">{quote.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {SERVICE_LABELS[
                          quote.serviceType as keyof typeof SERVICE_LABELS
                        ] ?? quote.serviceType}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {PROPERTY_SIZE_LABELS[
                          quote.propertySize as keyof typeof PROPERTY_SIZE_LABELS
                        ] ?? quote.propertySize}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            quote.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : quote.status === "quoted"
                                ? "bg-blue-100 text-blue-800"
                                : quote.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(quote.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/quotes/${quote.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
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

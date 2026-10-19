import Link from "next/link";
import { desc } from "drizzle-orm";
import { AlertCircle, ArrowUpRight, ClipboardList, CreditCard, Send } from "lucide-react";
import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { formatDate, formatPrice } from "@/lib/utils";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { signOut } from "@/auth";

async function getQuotes() {
  try {
    const db = requireDb();
    const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
    return { available: true, quotes: allQuotes, loadedAt: Date.now() };
  } catch {
    return { available: false, quotes: [], loadedAt: Date.now() };
  }
}

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  quoted: "bg-blue-50 text-blue-800",
  paid: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
};
const statusLabels = { pending: "Needs a quote", quoted: "Quote sent", paid: "Paid", cancelled: "Cancelled" };

export default async function AdminDashboard() {
  const result = await getQuotes();
  const allQuotes = result.quotes;
  const stats = [
    { label: "Awaiting your review", value: allQuotes.filter((q) => q.status === "pending").length, icon: ClipboardList, color: "bg-[#d6f28b]" },
    { label: "Quotes with clients", value: allQuotes.filter((q) => q.status === "quoted").length, icon: Send, color: "bg-blue-50" },
    { label: "Paid bookings", value: allQuotes.filter((q) => q.status === "paid").length, icon: CreditCard, color: "bg-emerald-50" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-navy">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <BrandLogo href="/admin" contained width={120} height={80} />
            <span className="hidden border-l border-navy/10 pl-4 text-xs font-semibold tracking-widest text-slate-500 sm:inline">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/admin/bookings">Paid bookings</Link></Button>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
              <Button variant="outline" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2457e8]">Your cleaning business</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Enquiries & quotes</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Review each enquiry, build a clear price, and send your client a quote with a secure Revolut payment link.</p>
          </div>
          <p className="text-sm text-slate-500">{result.available ? `${allQuotes.length} enquiries` : "Connection unavailable"}</p>
        </div>

        {!result.available ? (
          <div role="alert" className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
            <div><h2 className="font-semibold">Enquiries could not be loaded</h2><p className="mt-2 text-sm leading-6">The database is currently unavailable. Existing enquiries have not been removed. Refresh this page when the connection is restored.</p><Button asChild variant="outline" size="sm" className="mt-4"><a href="/admin">Try again</a></Button></div>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-navy/5 bg-white p-6">
                  <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></div>
                  <span className={`rounded-2xl p-3 ${color}`}><Icon className="h-5 w-5" /></span>
                </div>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
              <div className="flex items-center justify-between border-b border-navy/10 px-6 py-5"><h2 className="font-semibold">All enquiries</h2><span className="text-xs text-slate-500">Most recent first</span></div>
              {allQuotes.length === 0 ? (
                <div className="px-6 py-16 text-center"><ClipboardList className="mx-auto mb-4 h-9 w-9 text-[#2457e8]" /><h3 className="font-semibold">Ready for your first enquiry</h3><p className="mt-2 text-sm text-slate-500">New website enquiries will appear here for you to review and quote.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead><tr className="border-b border-navy/10 bg-slate-50/70 text-left text-xs text-slate-500"><th scope="col" className="px-6 py-4 font-medium">Client</th><th scope="col" className="px-5 py-4 font-medium">Cleaning request</th><th scope="col" className="px-5 py-4 font-medium">Status</th><th scope="col" className="px-5 py-4 font-medium">Quote total</th><th scope="col" className="px-5 py-4 font-medium">Received</th><th scope="col" className="px-6 py-4 font-medium">Action</th></tr></thead>
                    <tbody>
                      {allQuotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-navy/5 transition-colors last:border-0 hover:bg-[#f7f8f4]/70">
                          <td className="px-6 py-5"><p className="font-semibold">{quote.name}</p><p className="mt-1 text-xs text-slate-500">{quote.email}</p></td>
                          <td className="px-5 py-5"><p>{SERVICE_LABELS[quote.serviceType as keyof typeof SERVICE_LABELS] ?? quote.serviceType}</p><p className="mt-1 text-xs text-slate-500">{PROPERTY_SIZE_LABELS[quote.propertySize as keyof typeof PROPERTY_SIZE_LABELS] ?? quote.propertySize}{quote.postcode ? ` · ${quote.postcode}` : ""}</p></td>
                          <td className="px-5 py-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${quote.status === "quoted" && !quote.quoteEmailSentAt ? statusStyles.pending : statusStyles[quote.status]}`}>{quote.sendStartedAt && new Date(quote.sendStartedAt).getTime() + 120_000 > result.loadedAt ? "Sending…" : quote.status === "quoted" && !quote.quoteEmailSentAt ? "Email not sent" : statusLabels[quote.status]}</span></td>
                          <td className="px-5 py-5 font-semibold tabular-nums">{quote.priceCents === null ? <span className="font-normal text-slate-400">To prepare</span> : formatPrice(quote.priceCents)}</td>
                          <td className="px-5 py-5 text-xs text-slate-500">{formatDate(quote.createdAt)}</td>
                          <td className="px-6 py-5 text-right"><Button asChild variant="ghost" size="sm" className="text-[#2457e8]"><Link href={`/admin/quotes/${quote.id}`} aria-label={`Review quote for ${quote.name}`}>Review quote<ArrowUpRight className="h-4 w-4" /></Link></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

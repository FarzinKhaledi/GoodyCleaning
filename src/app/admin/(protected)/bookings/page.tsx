import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AlertCircle, ArrowUpRight, CalendarCheck2, CheckCircle2, CreditCard } from "lucide-react";
import { requireDb } from "@/lib/db";
import { bookings, quotes } from "@/lib/db/schema";
import { formatPrice, formatDate } from "@/lib/utils";
import { SERVICE_LABELS } from "@/lib/pricing";

async function getPaidBookings() {
  try {
    const rows = await requireDb().select({
      id: bookings.id, amountCents: bookings.amountCents, paidAt: bookings.paidAt,
      quoteId: quotes.id, name: quotes.name, email: quotes.email, phone: quotes.phone,
      serviceType: quotes.serviceType, postcode: quotes.postcode,
    }).from(bookings).innerJoin(quotes, eq(bookings.quoteId, quotes.id))
      .orderBy(desc(bookings.createdAt));
    return { available: true, rows };
  } catch { return { available: false, rows: [] }; }
}

export default async function BookingsPage() {
  const { available, rows } = await getPaidBookings();
  const total = rows.reduce((sum, row) => sum + row.amountCents, 0);
  return <main className="mx-auto max-w-[1580px] px-5 py-8 sm:px-6 xl:p-[38px]">
    <div className="mb-8"><p className="text-[9px] font-semibold tracking-[0.16em] text-slate-500">READY FOR THE NEXT CLEAN</p><h1 className="mt-3 text-[34px] font-semibold tracking-[-0.055em]">Paid bookings<span className="text-[#2457e8]">.</span></h1><p className="mt-3 text-xs leading-6 text-slate-500">Review payments and contact your clients to arrange their cleaning.</p></div>
    {!available ? <div role="alert" className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><AlertCircle size={22} /><div><h2 className="font-semibold">Bookings could not be loaded</h2><p className="mt-2 text-xs leading-6">The database is currently unavailable. Refresh this page to try again.</p></div></div> : <>
      <div className="mb-7 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex justify-between text-xs text-slate-500"><span>Paid bookings</span><CalendarCheck2 size={18} className="text-[#2457e8]" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{rows.length}</p><p className="mt-3 text-[10px] text-slate-400">Cleaning quotes with recorded payments</p></div><div className="rounded-xl bg-navy p-6 text-white"><div className="flex justify-between text-xs text-slate-300"><span>Total payments</span><CreditCard size={18} className="text-[#d6f28b]" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{formatPrice(total)}</p><p className="mt-3 text-[10px] text-slate-400">Across paid cleaning bookings</p></div></div>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5"><h2 className="text-base font-semibold">Your paid bookings</h2><span className="text-[10px] text-slate-400">Most recent first</span></div>
        {rows.length === 0 ? <div className="px-6 py-16 text-center"><CheckCircle2 className="mx-auto mb-4 text-[#2457e8]" size={32} /><h3 className="text-base font-semibold">Your next clean starts here</h3><p className="mt-3 text-xs leading-6 text-slate-500">Paid quotes will appear here once payment is confirmed.</p><Link href="/admin" className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-[#2457e8]">Review enquiries<ArrowUpRight size={14} /></Link></div> : <div className="divide-y divide-slate-100">{rows.map(row => <article key={row.id} className="grid gap-4 px-6 py-6 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-center"><div className="min-w-0"><h3 className="text-sm font-semibold">{row.name}</h3><a href={`mailto:${row.email}`} className="mt-1.5 block break-all text-xs text-slate-500 hover:text-[#2457e8]">{row.email}</a><a href={`tel:${row.phone}`} className="mt-1 block text-[11px] text-slate-400 hover:text-[#2457e8]">{row.phone}</a></div><div><p className="text-xs font-medium">{SERVICE_LABELS[row.serviceType as keyof typeof SERVICE_LABELS] ?? row.serviceType}</p><p className="mt-1.5 text-[10px] text-slate-400">GC-{row.quoteId.slice(0, 8).toUpperCase()}{row.postcode ? ` · ${row.postcode}` : ""}</p></div><div><p className="text-base font-semibold tabular-nums">{formatPrice(row.amountCents)}</p><span className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-emerald-600"><CheckCircle2 size={12} />{row.paidAt ? `Paid ${formatDate(row.paidAt)}` : "Payment recorded"}</span></div><Link href={`/admin/quotes/${row.quoteId}`} className="inline-flex w-fit items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] font-medium text-[#2457e8]">View booking<ArrowUpRight size={14} /></Link></article>)}</div>}
      </section>
    </>}
  </main>;
}

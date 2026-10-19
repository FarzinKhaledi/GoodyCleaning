"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownUp, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, CreditCard, RefreshCw, Search, Send, X } from "lucide-react";
import type { Quote } from "@/lib/db/schema";
import { SERVICE_LABELS, PROPERTY_SIZE_LABELS } from "@/lib/pricing";
import { formatDate, formatPrice } from "@/lib/utils";
import styles from "./dashboard.module.css";

export type AdminQuoteSummary = Pick<Quote, "id" | "name" | "email" | "phone" | "serviceType" | "propertySize" | "postcode" | "status" | "priceCents" | "createdAt" | "quoteEmailSentAt" | "sendStartedAt">;
type Filter = "all" | Quote["status"];
const statuses = { pending: "Needs a quote", quoted: "Quote sent", paid: "Paid", cancelled: "Cancelled" };
const filters: { id: Filter; label: string }[] = [{ id: "all", label: "All enquiries" }, { id: "pending", label: "Needs a quote" }, { id: "quoted", label: "With clients" }, { id: "paid", label: "Paid" }, { id: "cancelled", label: "Cancelled" }];
const PAGE_SIZE = 12;
function service(q: AdminQuoteSummary) { return SERVICE_LABELS[q.serviceType as keyof typeof SERVICE_LABELS] ?? q.serviceType; }
function property(q: AdminQuoteSummary) { return PROPERTY_SIZE_LABELS[q.propertySize as keyof typeof PROPERTY_SIZE_LABELS] ?? q.propertySize; }
function Status({ quote: q, now }: { quote: AdminQuoteSummary; now: number }) {
  const sending = q.sendStartedAt && new Date(q.sendStartedAt).getTime() + 120_000 > now;
  const unsent = q.status === "quoted" && !q.quoteEmailSentAt;
  return <span className={`${styles.status} ${styles[unsent ? "pending" : q.status]}`}><span />{sending ? "Sending…" : unsent ? "Email needs retry" : statuses[q.status]}</span>;
}

export function DashboardClient({ quotes, available, loadedAt }: { quotes: AdminQuoteSummary[]; available: boolean; loadedAt: number }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const pending = quotes.filter(q => q.status === "pending");
  const quoted = quotes.filter(q => q.status === "quoted");
  const paid = quotes.filter(q => q.status === "paid");
  const revenue = paid.reduce((sum, q) => sum + (q.priceCents ?? 0), 0);
  const outstanding = quoted.reduce((sum, q) => sum + (q.priceCents ?? 0), 0);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("en-GB");
    return quotes.filter(q => (filter === "all" || q.status === filter) && (!term || [q.name, q.email, q.phone, q.postcode, service(q), property(q), `GC-${q.id.slice(0, 8)}`].some(value => value?.toLocaleLowerCase("en-GB").includes(term)))).sort((a,b) => sort === "value" ? (b.priceCents ?? -1) - (a.priceCents ?? -1) : sort === "oldest" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes, filter, query, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  function chooseFilter(value: Filter) { setFilter(value); setPage(1); }
  const metrics = [
    { label: "Awaiting a quote", value: String(pending.length), detail: "Enquiries ready for your review", icon: ClipboardList, filter: "pending" as Filter, color: "blue" },
    { label: "With your clients", value: String(quoted.length), detail: `${formatPrice(outstanding)} awaiting payment`, icon: Send, filter: "quoted" as Filter, color: "amber" },
    { label: "Paid bookings", value: String(paid.length), detail: "Payments received", icon: CheckCircle2, filter: "paid" as Filter, color: "green" },
    { label: "Total paid", value: formatPrice(revenue), detail: "Across paid cleaning quotes", icon: CreditCard, filter: "paid" as Filter, color: "navy" },
  ];
  return <main className={styles.main}>
    <div className={styles.heading}><div><span className={styles.eyebrow}>YOUR CLEANING BUSINESS, AT A GLANCE</span><h1>Enquiries & quotes<span>.</span></h1><p>From the first enquiry to a beautifully prepared quote.</p></div><button type="button" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing} className={styles.refresh}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</button></div>
    {!available ? <div role="alert" className={styles.unavailable}><AlertCircle size={24} /><div><h2>Enquiries could not be loaded</h2><p>The database is currently unavailable. Refresh to try again.</p></div></div> : <>
      <div className={styles.metrics}>{metrics.map(({ label, value, detail, icon: Icon, filter: target, color }) => <button type="button" key={label} onClick={() => chooseFilter(target)} className={`${styles.metric} ${styles[color]}`}><div><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><p>{detail}<ArrowUpRight size={13} /></p></button>)}</div>
      <section className={styles.pipeline} aria-label="Quote workflow"><div><span className={styles.pipelineIcon}><Check size={15} /></span><p><strong>A clear quote. A confident client.</strong><span>Review the details, refine the price, then preview and send.</span></p></div><div className={styles.steps}><span><span>1</span>Review</span><ArrowRight size={12} /><span><span>2</span>Prepare</span><ArrowRight size={12} /><span><span>3</span>Send</span></div></section>
      <section className={styles.inbox} aria-label="Cleaning enquiries">
        <div className={styles.inboxHeading}><div><h2>Your enquiries<span>{quotes.length}</span></h2><p>Everything you need to prepare the next clean.</p></div><span className={styles.updated}><Clock3 size={12} />Updated {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(loadedAt))}</span></div>
        <div className={styles.filters} role="group" aria-label="Filter enquiries by status">{filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => chooseFilter(item.id)} className={filter === item.id ? styles.selected : ""}>{item.label}<span>{item.id === "all" ? quotes.length : quotes.filter(q => q.status === item.id).length}</span></button>)}</div>
        <div className={styles.toolbar}><div className={styles.search}><Search size={16} /><label htmlFor="enquiry-search" className="sr-only">Search enquiries</label><input id="enquiry-search" type="search" placeholder="Search name, email, postcode or reference…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div><div className={styles.sort}><ArrowDownUp size={13} /><label htmlFor="enquiry-sort" className="sr-only">Sort enquiries</label><select id="enquiry-sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value">Highest quote</option></select></div></div>
        {rows.length === 0 ? <div className={styles.empty}><div><ClipboardList size={27} /></div><h3>{quotes.length === 0 ? "Ready for your first enquiry" : "No matching enquiries"}</h3><p>{quotes.length === 0 ? "New cleaning enquiries will appear here, ready for you to review." : "Try another search or show all enquiries."}</p>{quotes.length > 0 && <button type="button" onClick={() => { setQuery(""); chooseFilter("all"); }}><X size={13} />Clear filters</button>}</div> : <>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Customer</th><th scope="col">Cleaning request</th><th scope="col">Status</th><th scope="col">Quote total</th><th scope="col">Received</th><th scope="col"><span className="sr-only">Review enquiry</span></th></tr></thead><tbody>{rows.map(q => <tr key={q.id}><td><div className={styles.customer}><span className={styles.customerAvatar}>{q.name.trim().charAt(0).toUpperCase()}</span><div><strong>{q.name}</strong><span>{q.email}</span></div></div></td><td><strong className={styles.service}>{service(q)}</strong><span className={styles.secondary}>{property(q)}{q.postcode ? ` · ${q.postcode}` : ""}</span></td><td><Status quote={q} now={loadedAt} /></td><td><span className={styles.amount}>{q.priceCents === null ? "To prepare" : formatPrice(q.priceCents)}</span></td><td><span className={styles.received}>{formatDate(q.createdAt)}</span><span className={styles.reference}>GC-{q.id.slice(0, 8).toUpperCase()}</span></td><td><Link href={`/admin/quotes/${q.id}`} className={styles.review} aria-label={`Review quote for ${q.name}`}>Review<ArrowUpRight size={14} /></Link></td></tr>)}</tbody></table></div>
          <div className={styles.mobileList}>{rows.map(q => <Link key={q.id} href={`/admin/quotes/${q.id}`} className={styles.mobileCard} aria-label={`Review quote for ${q.name}`}><div><strong>{q.name}</strong><ArrowUpRight size={17} /></div><span>{q.email}</span><p>{service(q)} · {property(q)}</p><div><Status quote={q} now={loadedAt} /><strong>{q.priceCents === null ? "To prepare" : formatPrice(q.priceCents)}</strong></div><small>{formatDate(q.createdAt)}{q.postcode ? ` · ${q.postcode}` : ""}</small></Link>)}</div>
        </>}
        <div className={styles.pagination}><span aria-live="polite">{visible.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visible.length)} of ${visible.length} enquiries` : "0 enquiries"}</span><div><button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /></button><span>Page {currentPage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} /></button></div></div>
      </section>
    </>}
  </main>;
}

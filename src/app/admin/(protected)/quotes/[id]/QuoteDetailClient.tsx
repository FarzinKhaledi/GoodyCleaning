"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, ExternalLink, Eye, FilePenLine, Loader2, LockKeyhole, Mail, Plus, Save, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/BrandLogo";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Quote } from "@/lib/db/schema";
import { calculateQuoteTotal, type QuoteLineItem } from "@/lib/quotes/pricing";

interface QuoteDetailProps { quote: Quote; serviceLabel: string; propertyLabel: string; }
interface DraftItem { key: string; description: string; quantity: string; unitPrice: string; }
interface Draft { items: DraftItem[]; discount: string; customerNotes: string; internalNotes: string; }
type Activity = "save" | "send" | "reopen" | null;

function moneyInput(cents: number) { return (cents / 100).toFixed(2); }
function parseMoney(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [pounds, pence = ""] = value.trim().split(".");
  const amount = Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
function draftFromQuote(quote: Quote, serviceLabel: string): Draft {
  const items = quote.lineItems.length > 0 ? quote.lineItems : [{ description: serviceLabel, quantity: 1, unitPriceCents: quote.priceCents ?? 0 }];
  return {
    items: items.map((item, index) => ({ key: `saved-${index}`, description: item.description, quantity: String(item.quantity), unitPrice: item.unitPriceCents === 0 && quote.priceCents === null ? "" : moneyInput(item.unitPriceCents) })),
    discount: moneyInput(quote.discountCents), customerNotes: quote.customerNotes ?? "", internalNotes: quote.internalNotes ?? "",
  };
}
function draftContent(draft: Draft) { return JSON.stringify({ ...draft, items: draft.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) }); }

const statusLabels = { pending: "Draft quote", quoted: "Quote sent", paid: "Payment received", cancelled: "Cancelled" };
const panelClass = "rounded-2xl border border-navy/10 bg-white";
const primaryButton = "bg-[#2457e8] text-white shadow-none hover:bg-[#1947d0]";

export function QuoteDetailClient({ quote: initialQuote, serviceLabel, propertyLabel }: QuoteDetailProps) {
  const [quote, setQuote] = useState(initialQuote);
  const [draft, setDraft] = useState(() => draftFromQuote(initialQuote, serviceLabel));
  const [activity, setActivity] = useState<Activity>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reopenConfirmation, setReopenConfirmation] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const nextRow = useRef(0);
  const busyRef = useRef(false);
  const dirty = draftContent(draft) !== draftContent(draftFromQuote(quote, serviceLabel));
  const sendLeaseExpiresAt = quote.sendStartedAt ? new Date(quote.sendStartedAt).getTime() + 120_000 : 0;
  const sendingOnServer = sendLeaseExpiresAt > now;
  const editable = quote.status === "pending" && !sendingOnServer && !activity && !conflict;

  useEffect(() => {
    if (!quote.sendStartedAt) return;
    const expiresAt = new Date(quote.sendStartedAt).getTime() + 120_000;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, expiresAt - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [quote.sendStartedAt]);

  const pricing = useMemo(() => {
    const items: QuoteLineItem[] = [];
    if (draft.items.length < 1 || draft.items.length > 20) return { error: "Add between 1 and 20 items.", items, subtotal: 0, total: 0, discountCents: 0 };
    for (const item of draft.items) {
      const quantity = Number(item.quantity);
      const unitPriceCents = parseMoney(item.unitPrice);
      if (!item.description.trim() || item.description.trim().length > 200) return { error: "Give every item a description of up to 200 characters.", items, subtotal: 0, total: 0, discountCents: 0 };
      if (!/^\d+$/.test(item.quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return { error: "Each quantity must be a whole number between 1 and 100.", items, subtotal: 0, total: 0, discountCents: 0 };
      if (unitPriceCents === null) return { error: "Enter each unit price in pounds, with up to two decimal places.", items, subtotal: 0, total: 0, discountCents: 0 };
      items.push({ description: item.description.trim(), quantity, unitPriceCents });
    }
    const discountCents = parseMoney(draft.discount || "0");
    if (discountCents === null) return { error: "Enter a valid discount in pounds.", items, subtotal: 0, total: 0, discountCents: 0 };
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    try {
      const total = calculateQuoteTotal(items, discountCents);
      return { error: "", items, subtotal, total, discountCents };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Check your quote prices and discount.", items, subtotal, total: 0, discountCents };
    }
  }, [draft.items, draft.discount]);
  const canReview = !dirty && !pricing.error && !activity && !conflict && !sendingOnServer && (quote.status === "pending" || quote.status === "quoted");

  function updateItem(key: string, field: "description" | "quantity" | "unitPrice", value: string) {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item) }));
    setNotice(null);
  }

  async function request(action: Exclude<Activity, null>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setActivity(action);
    setNotice(null);
    try {
      const body = action === "save" ? { version: quote.version, lineItems: pricing.items, discountCents: pricing.discountCents, customerNotes: draft.customerNotes.trim() || null, internalNotes: draft.internalNotes.trim() || null } : { version: quote.version };
      const response = await fetch(`/api/admin/quotes/${quote.id}${action === "save" ? "" : `/${action}`}`, { method: action === "save" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        if (action === "send" && data.quote) setQuote(data.quote);
        if (response.status === 409) setConflict(true);
        throw new Error(data.error || "This action could not be completed. Please try again.");
      }
      if (action === "send") {
        setQuote(data.quote ?? { ...quote, status: "quoted", checkoutUrl: data.checkoutUrl, quoteEmailSentAt: new Date(), sendStartedAt: null, version: quote.version + 1 });
        setPreviewOpen(false);
        setNotice({ kind: "success", text: "Quote emailed to the client with their secure Revolut payment link." });
      } else {
        setQuote(data.quote);
        setDraft(draftFromQuote(data.quote, serviceLabel));
        setReopenConfirmation(false);
        setNotice({ kind: "success", text: action === "save" ? "Draft saved. Review the client preview when you’re ready to send." : "The previous payment link has been cancelled. You can now revise this draft." });
      }
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to complete this action." });
    } finally {
      busyRef.current = false;
      setActivity(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-navy">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-3 sm:px-8">
          <Button asChild variant="ghost" size="icon"><Link href="/admin" aria-label="Back to enquiries"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <BrandLogo href="/admin" contained width={100} height={67} />
          <span className="ml-auto rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold">{sendingOnServer ? "Sending in progress" : quote.status === "quoted" && !quote.quoteEmailSentAt ? "Email not sent" : statusLabels[quote.status]}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2457e8]">Enquiry · {quote.id.slice(0, 8).toUpperCase()}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A clean space for {quote.name.split(" ")[0]}</h1><p className="mt-3 text-sm text-slate-500">Received {formatDate(quote.createdAt)} · {serviceLabel}</p></div>
          <span className="flex items-center gap-2 text-xs text-slate-500">{dirty ? <><span className="h-2 w-2 rounded-full bg-amber-500" />Unsaved changes</> : <><Check className="h-4 w-4" />Saved enquiry</>}</span>
        </div>

        {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`mb-6 flex gap-3 rounded-xl border p-4 text-sm leading-6 ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{notice.kind === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}<p>{notice.text}</p></div>}
        {conflict && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-semibold">The enquiry has changed since you opened it.</p><p className="mt-2 leading-6">Your edits are still shown below. Copy anything you need before loading the latest version; reloading will replace this draft.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>Load latest version</Button></div>}
        {sendingOnServer && <div role="status" className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">A quote is being sent. Editing and sending are paused to prevent duplicate payment links. Refresh this page to see the result.</div>}

        <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            <section className={panelClass} aria-labelledby="request-heading">
              <div className="border-b border-navy/10 px-6 py-5"><h2 id="request-heading" className="font-semibold">The client’s request</h2></div>
              <div className="grid gap-5 p-6 text-sm sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Client</p><p className="mt-1 font-semibold">{quote.name}</p><a className="mt-1 block break-all text-[#2457e8] hover:underline" href={`mailto:${quote.email}`}>{quote.email}</a><a className="mt-1 block text-slate-600 hover:underline" href={`tel:${quote.phone}`}>{quote.phone}</a></div>
                <div><p className="text-xs text-slate-500">Space & service</p><p className="mt-1 font-medium">{serviceLabel}</p><p className="mt-1 text-slate-600">{propertyLabel}{quote.postcode ? ` · ${quote.postcode}` : ""}</p><p className="mt-1 text-slate-600">Preferred date: {quote.preferredDate ? formatDate(quote.preferredDate) : "To be agreed"}</p></div>
                {quote.message && <div className="sm:col-span-2"><p className="mb-2 text-xs text-slate-500">Additional details</p><p className="whitespace-pre-wrap break-words rounded-xl bg-[#f7f8f4] p-4 leading-6 text-slate-600">{quote.message}</p></div>}
              </div>
            </section>

            <form onSubmit={(event) => { event.preventDefault(); if (editable && dirty && !pricing.error) void request("save"); }}>
              <section className={panelClass} aria-labelledby="quote-heading">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-6 py-5"><div><h2 id="quote-heading" className="font-semibold">Build the quote</h2><p className="mt-1 text-xs leading-5 text-slate-500">Set your prices and refine what’s included. All amounts are in GBP.</p></div><FilePenLine className="h-5 w-5 text-[#2457e8]" /></div>
                <fieldset disabled={!editable} className="min-w-0 p-4 sm:p-6">
                  <legend className="sr-only">Quote line items and notes</legend>
                  <div className="space-y-4">
                    {draft.items.map((item, index) => (
                      <div key={item.key} className="rounded-xl border border-navy/10 bg-[#f7f8f4]/70 p-4">
                        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">ITEM {index + 1}</span><Button type="button" variant="ghost" size="icon" disabled={draft.items.length <= 1 || !editable} className="h-8 w-8 text-slate-500 hover:text-red-600" aria-label={`Remove item ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((row) => row.key !== item.key) }))}><Trash2 className="h-4 w-4" /></Button></div>
                        <Label htmlFor={`${item.key}-description`}>Description</Label><Input id={`${item.key}-description`} value={item.description} maxLength={200} onChange={(event) => updateItem(item.key, "description", event.target.value)} placeholder="e.g. Deep cleaning — agreed scope" className="mt-2" required />
                        <div className="mt-4 grid grid-cols-[0.8fr_1fr_1fr] items-end gap-3">
                          <div><Label htmlFor={`${item.key}-quantity`}>Qty</Label><Input id={`${item.key}-quantity`} value={item.quantity} type="number" min="1" max="100" step="1" onChange={(event) => updateItem(item.key, "quantity", event.target.value)} className="mt-2 px-3" required /></div>
                          <div><Label htmlFor={`${item.key}-price`}>Unit price (£)</Label><Input id={`${item.key}-price`} value={item.unitPrice} inputMode="decimal" onChange={(event) => updateItem(item.key, "unitPrice", event.target.value)} placeholder="0.00" className="mt-2 px-3" required /></div>
                          <div className="pb-3 text-right"><p className="mb-2 text-xs text-slate-500">Line total</p><p className="text-sm font-semibold tabular-nums">{parseMoney(item.unitPrice) !== null && /^\d+$/.test(item.quantity) ? formatPrice((parseMoney(item.unitPrice) ?? 0) * Number(item.quantity)) : "—"}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="mt-3 text-[#2457e8]" disabled={draft.items.length >= 20 || !editable} onClick={() => { nextRow.current += 1; setDraft((current) => ({ ...current, items: [...current.items, { key: `new-${nextRow.current}`, description: "", quantity: "1", unitPrice: "" }] })); }}><Plus className="h-4 w-4" />Add an item</Button>
                  <div className="mt-5 max-w-[220px]"><Label htmlFor="discount">Discount (£)</Label><Input id="discount" value={draft.discount} inputMode="decimal" className="mt-2" onChange={(event) => setDraft((current) => ({ ...current, discount: event.target.value }))} /><p className="mt-2 text-xs text-slate-500">A fixed amount off the subtotal.</p></div>
                  <div className="mt-7"><Label htmlFor="customer-notes">A note for your client</Label><Textarea id="customer-notes" value={draft.customerNotes} maxLength={5000} className="mt-2" onChange={(event) => setDraft((current) => ({ ...current, customerNotes: event.target.value }))} placeholder="Explain what’s included, any agreed details, and next steps." /><p className="mt-2 text-xs text-slate-500">Included in the quote email.</p></div>
                  <div className="mt-6"><Label htmlFor="internal-notes" className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5" />Private team notes</Label><Textarea id="internal-notes" value={draft.internalNotes} maxLength={5000} className="mt-2 min-h-[100px] bg-slate-50" onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))} placeholder="Add any details for your team." /><p className="mt-2 text-xs text-slate-500">Only visible in the admin dashboard.</p></div>
                </fieldset>
                {quote.status === "pending" && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 px-6 py-5"><p className="max-w-sm text-xs leading-5 text-slate-500">{dirty ? "Save your changes before reviewing the client preview." : "Your saved draft is ready for review when the price is complete."}</p><Button type="submit" variant="outline" disabled={!editable || !dirty || Boolean(pricing.error)} size="sm">{activity === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save draft</Button></div>}
              </section>
            </form>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
              <div className="bg-navy p-6 text-white"><p className="text-xs font-medium uppercase tracking-widest text-white/60">Client quote</p><p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{pricing.error ? "—" : formatPrice(pricing.total)}</p><p className="mt-2 text-xs text-white/60">Total payable in GBP</p></div>
              <div className="space-y-4 p-6">
                <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium tabular-nums">{pricing.error ? "—" : formatPrice(pricing.subtotal)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Discount</dt><dd className="font-medium tabular-nums">{pricing.error ? "—" : `−${formatPrice(pricing.discountCents)}`}</dd></div></dl>
                {pricing.error && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{pricing.error}</p>}
                {quote.status === "paid" ? <p className="flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />Payment received. This quote is locked.</p> : quote.status === "cancelled" ? <p className="text-sm leading-6 text-slate-500">This enquiry is cancelled. Its quote cannot be sent.</p> : <>
                  <Button type="button" className={`w-full ${primaryButton}`} disabled={!canReview} onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" />{quote.status === "quoted" && quote.quoteEmailSentAt ? "Review & resend" : "Review client preview"}</Button>
                  <p className="text-xs leading-5 text-slate-500">{quote.status === "quoted" ? quote.quoteEmailSentAt ? "Resending uses the existing Revolut payment link and price." : "The payment link is saved. Sending this quote will reuse that link and price." : "You’ll review the details before sending. The payment link is created securely when you send."}</p>
                </>}
                {quote.checkoutUrl && quote.status === "quoted" && <a href={quote.checkoutUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2457e8] hover:underline">View Revolut payment link<ExternalLink className="h-3.5 w-3.5" /></a>}
                {quote.quoteEmailSentAt && <p className="border-t border-navy/10 pt-4 text-xs text-slate-500">Last emailed {formatDate(quote.quoteEmailSentAt)}</p>}
              </div>
            </section>
            {quote.status === "quoted" && <section className={`${panelClass} p-6`}><h2 className="text-sm font-semibold">Need to change the quote?</h2><p className="mt-2 text-xs leading-5 text-slate-500">Reopen the draft to adjust items or price. The current Revolut payment link will be cancelled before editing.</p>{reopenConfirmation ? <div className="mt-4 space-y-3"><p className="text-sm font-medium">Cancel the current link and revise?</p><Button type="button" variant="outline" size="sm" className="w-full" disabled={Boolean(activity) || conflict || sendingOnServer} onClick={() => void request("reopen")}>{activity === "reopen" && <Loader2 className="h-4 w-4 animate-spin" />}Cancel link & reopen</Button><Button type="button" variant="ghost" size="sm" className="w-full" disabled={Boolean(activity)} onClick={() => setReopenConfirmation(false)}>Keep current quote</Button></div> : <Button type="button" variant="outline" size="sm" className="mt-4 w-full" disabled={Boolean(activity) || conflict || sendingOnServer} onClick={() => setReopenConfirmation(true)}><FilePenLine className="h-4 w-4" />Revise quote</Button>}</section>}
            <p className="flex gap-2 px-2 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />Payments are handled by Revolut. Private team notes are kept in your dashboard.</p>
          </aside>
        </div>
      </main>

      <Dialog.Root open={previewOpen} onOpenChange={(open) => { if (!activity) setPreviewOpen(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[92dvh] max-w-2xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-[#f7f8f4] text-navy shadow-2xl focus:outline-none sm:inset-x-6">
            <div className="flex items-start justify-between gap-4 border-b border-navy/10 bg-white p-5 sm:px-7"><div><Dialog.Title className="text-lg font-semibold">Review before sending</Dialog.Title><Dialog.Description className="mt-1 text-xs leading-5 text-slate-500">Check the client’s details, agreed scope and final price.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" disabled={Boolean(activity)} className="h-8 w-8 shrink-0" aria-label="Close quote preview"><X className="h-4 w-4" /></Button></Dialog.Close></div>
            <div className="overflow-y-auto p-4 sm:p-7">
              <p className="mb-4 flex items-center gap-2 break-all text-xs text-slate-600"><Mail className="h-4 w-4 shrink-0" />To: {quote.email}</p>
              <div className="overflow-hidden rounded-xl border border-navy/10 bg-white">
                <div className="bg-navy px-6 py-5"><BrandLogo width={150} height={100} /></div>
                <div className="p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#2457e8]">Your clean, your way</p><h3 className="mt-3 text-2xl font-semibold tracking-tight">Your GoodyCleaning quote</h3><p className="mt-4 text-sm leading-6 text-slate-600">Hi {quote.name}, here’s your quote for {serviceLabel.toLowerCase()} at your {propertyLabel.toLowerCase()}.</p>
                  <div className="mt-6 space-y-4 border-y border-navy/10 py-5">{pricing.items.map((item, index) => <div key={index} className="flex items-start justify-between gap-4 text-sm"><div className="min-w-0"><p className="break-words font-medium">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.quantity} × {formatPrice(item.unitPriceCents)}</p></div><p className="shrink-0 font-medium tabular-nums">{formatPrice(item.quantity * item.unitPriceCents)}</p></div>)}{pricing.discountCents > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Discount</span><span>−{formatPrice(pricing.discountCents)}</span></div>}</div>
                  <div className="mt-5 flex items-center justify-between gap-4"><span className="font-semibold">Total (GBP)</span><span className="text-2xl font-semibold tabular-nums">{formatPrice(pricing.total)}</span></div>
                  {draft.customerNotes.trim() && <p className="mt-6 whitespace-pre-wrap break-words rounded-xl bg-[#f7f8f4] p-4 text-sm leading-6 text-slate-600">{draft.customerNotes.trim()}</p>}
                  <div className="mt-6 rounded-xl bg-[#d6f28b] px-5 py-4 text-center text-sm font-semibold">Pay securely with Revolut · {formatPrice(pricing.total)}</div><p className="mt-3 text-center text-xs leading-5 text-slate-500">A secure payment button will be included in your email.</p><p className="mt-6 text-xs leading-5 text-slate-500">Questions about your quote? Reply to support@goodyvan.com or call 0800 001 6171. We’ll agree your cleaning date and details with you.</p>
                </div>
              </div>
              {notice?.kind === "error" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">{notice.text}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 bg-white p-5 sm:px-7"><p className="max-w-[230px] text-xs leading-5 text-slate-500">From GoodyCleaning<br /><span className="font-medium">support@goodyvan.com</span></p><Button type="button" className={primaryButton} disabled={!canReview || Boolean(activity)} onClick={() => void request("send")}>{activity === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{activity === "send" ? "Sending…" : quote.status === "quoted" && quote.quoteEmailSentAt ? "Resend quote" : "Send quote to client"}</Button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Check,
  CheckCheck, CheckCircle2, ChevronRight, Clipboard, Copy, ExternalLink,
  Eye, FilePenLine, FileText, Loader2, LockKeyhole, Mail, Monitor,
  Plus, Save, Send, ShieldCheck, Smartphone, Trash2, UserRound, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Quote } from "@/lib/db/schema";
import { PROPERTY_SIZE_LABELS, SERVICE_LABELS } from "@/lib/pricing";
import { calculateQuotePricing, quoteCustomerDetailsSchema, type QuoteLineItem } from "@/lib/quotes/pricing";
import styles from "./quote-workspace.module.css";

interface QuoteDetailProps { quote: Quote; serviceLabel: string; propertyLabel: string; }
interface DraftItem { key: string; description: string; quantity: string; unitPrice: string; }
interface Draft {
  name: string; email: string; phone: string; serviceType: string; propertySize: string;
  postcode: string; preferredDate: string; message: string;
  items: DraftItem[]; discountType: "fixed" | "percentage"; discount: string;
  customerNotes: string; internalNotes: string;
}
interface EmailPreview { subject: string; html: string; to: string; from: string; replyTo: string; version: number; }
type Activity = "save" | "saveDetails" | "send" | "reopen" | null;

function moneyInput(cents: number) { return (cents / 100).toFixed(2); }
function parseDecimal(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
function dateInput(value: Quote["preferredDate"]) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}
function draftFromQuote(quote: Quote, serviceLabel: string): Draft {
  const items = quote.lineItems.length > 0 ? quote.lineItems : [{ description: serviceLabel, quantity: 1, unitPriceCents: quote.priceCents ?? 0 }];
  return {
    name: quote.name, email: quote.email, phone: quote.phone,
    serviceType: quote.serviceType, propertySize: quote.propertySize,
    postcode: quote.postcode ?? "", preferredDate: dateInput(quote.preferredDate), message: quote.message ?? "",
    items: items.map((item, index) => ({ key: `saved-${index}`, description: item.description, quantity: String(item.quantity), unitPrice: item.unitPriceCents === 0 && quote.priceCents === null ? "" : moneyInput(item.unitPriceCents) })),
    discountType: quote.discountType ?? "fixed",
    discount: quote.discountType === "percentage" ? String((quote.discountBasisPoints ?? 0) / 100) : moneyInput(quote.discountCents),
    customerNotes: quote.customerNotes ?? "", internalNotes: quote.internalNotes ?? "",
  };
}
function draftContent(draft: Draft) {
  return JSON.stringify({ ...draft, items: draft.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) });
}
function customerDetails(draft: Draft) {
  return {
    name: draft.name, email: draft.email, phone: draft.phone, serviceType: draft.serviceType,
    propertySize: draft.propertySize, postcode: draft.postcode.trim() || null,
    preferredDate: draft.preferredDate || null, message: draft.message.trim() || null,
  };
}

const statusLabels = { pending: "Draft", quoted: "Quote sent", paid: "Paid", cancelled: "Cancelled" };
const buttonClass = "bg-[#2457e8] text-white shadow-none hover:bg-[#1947d0]";

export function QuoteDetailClient({ quote: initialQuote, serviceLabel, propertyLabel }: QuoteDetailProps) {
  const [quote, setQuote] = useState(initialQuote);
  const [draft, setDraft] = useState(() => draftFromQuote(initialQuote, serviceLabel));
  const [activity, setActivity] = useState<Activity>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [recipientConfirmed, setRecipientConfirmed] = useState(false);
  const [reopenConfirmation, setReopenConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const nextRow = useRef(0);
  const editorRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const previewRequestRef = useRef(0);
  const dirty = draftContent(draft) !== draftContent(draftFromQuote(quote, serviceLabel));
  const customerDirty = JSON.stringify(customerDetails(draft)) !== JSON.stringify(customerDetails(draftFromQuote(quote, serviceLabel)));
  const sendLeaseExpiresAt = quote.sendStartedAt ? new Date(quote.sendStartedAt).getTime() + 120_000 : 0;
  const sendingOnServer = sendLeaseExpiresAt > now;
  const editable = quote.status === "pending" && !sendingOnServer && !activity && !conflict;
  const currentServiceLabel = SERVICE_LABELS[draft.serviceType as keyof typeof SERVICE_LABELS] ?? serviceLabel;
  const currentPropertyLabel = PROPERTY_SIZE_LABELS[draft.propertySize as keyof typeof PROPERTY_SIZE_LABELS] ?? propertyLabel;

  useEffect(() => {
    if (!quote.sendStartedAt) return;
    const expiresAt = new Date(quote.sendStartedAt).getTime() + 120_000;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, expiresAt - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [quote.sendStartedAt]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const confirmNavigation = () => window.confirm("You have unsaved quote changes. Leave this page and discard them?");
    const warnBeforeInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      if (!confirmNavigation()) { event.preventDefault(); event.stopPropagation(); }
    };
    const warnBeforeLeavingForm = (event: SubmitEvent) => {
      if (event.target === editorRef.current || event.defaultPrevented) return;
      if (!confirmNavigation()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", warnBeforeInternalNavigation, true);
    document.addEventListener("submit", warnBeforeLeavingForm, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("click", warnBeforeInternalNavigation, true);
      document.removeEventListener("submit", warnBeforeLeavingForm, true);
    };
  }, [dirty]);

  const customer = useMemo(() => quoteCustomerDetailsSchema.safeParse(customerDetails(draft)), [draft]);
  const customerErrors = customer.success ? {} : customer.error.flatten().fieldErrors;

  const pricing = useMemo(() => {
    const items: QuoteLineItem[] = [];
    const invalid = (error: string, subtotal = 0) => ({ error, items, subtotal, total: 0, discountCents: 0, discountBasisPoints: null as number | null });
    if (draft.items.length < 1 || draft.items.length > 20) return invalid("Add between 1 and 20 items.");
    for (const item of draft.items) {
      const quantity = Number(item.quantity);
      const unitPriceCents = parseDecimal(item.unitPrice);
      if (!item.description.trim() || item.description.trim().length > 200) return invalid("Give each item a description of up to 200 characters.");
      if (!/^\d+$/.test(item.quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return invalid("Each quantity must be a whole number between 1 and 100.");
      if (unitPriceCents === null) return invalid("Enter a unit price for each item to complete the quote.");
      if (unitPriceCents > 10_000_000) return invalid("Each unit price must be £100,000 or less.");
      items.push({ description: item.description.trim(), quantity, unitPriceCents });
    }
    const value = parseDecimal(draft.discount || "0");
    if (value === null) return invalid(`Enter a valid ${draft.discountType === "percentage" ? "percentage" : "discount in pounds"}, with up to two decimal places.`);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    if (draft.discountType === "percentage" && value > 10_000) return invalid("Percentage discount must be between 0% and 100%.", subtotal);
    if (draft.discountType === "fixed" && value > 10_000_000) return invalid("The fixed discount must be £100,000 or less.", subtotal);
    try {
      const totals = calculateQuotePricing(items, draft.discountType === "percentage"
        ? { discountType: "percentage", discountBasisPoints: value }
        : { discountType: "fixed", discountCents: value });
      return { error: "", items, subtotal: totals.subtotalCents, total: totals.totalCents, discountCents: totals.discountCents, discountBasisPoints: draft.discountType === "percentage" ? value : null };
    } catch (error) {
      return invalid(error instanceof Error ? error.message : "Check the quote prices and discount.", subtotal);
    }
  }, [draft.items, draft.discount, draft.discountType]);

  const validDraft = customer.success && !pricing.error;
  const canReview = !dirty && validDraft && !activity && !conflict && !sendingOnServer && (quote.status === "pending" || quote.status === "quoted");
  const canSend = canReview && preview?.version === quote.version && preview.to === quote.email && recipientConfirmed && !previewLoading;

  function updateDraft<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setNotice(null);
  }
  function updateItem(key: string, field: "description" | "quantity" | "unitPrice", value: string) {
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item) }));
    setNotice(null);
  }
  function closePreview() {
    if (activity) return;
    previewRequestRef.current += 1;
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreview(null);
    setPreviewError("");
    setRecipientConfirmed(false);
  }

  async function reviewEmail() {
    if (!canReview || previewLoading) return;
    const requestId = ++previewRequestRef.current;
    setPreviewOpen(true);
    setPreview(null);
    setPreviewLoading(true);
    setPreviewError("");
    setRecipientConfirmed(false);
    setPreviewDevice("desktop");
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/preview`, { cache: "no-store" });
      const data = await response.json();
      if (requestId !== previewRequestRef.current) return;
      if (!response.ok) throw new Error(data.error || "The email preview could not be loaded. Please try again.");
      if (data.version !== quote.version) {
        setConflict(true);
        throw new Error("This quote has changed. Load the latest version before reviewing or sending it.");
      }
      if (typeof data.html !== "string" || data.to !== quote.email) throw new Error("The preview does not match this customer. Please reload the quote.");
      if (requestId === previewRequestRef.current) setPreview(data);
    } catch (error) {
      if (requestId === previewRequestRef.current) setPreviewError(error instanceof Error ? error.message : "The email preview could not be loaded.");
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  }

  async function request(action: Exclude<Activity, null>) {
    if (busyRef.current || (action === "save" && (!editable || !dirty || !validDraft)) || (action === "saveDetails" && (!editable || !customerDirty || !customer.success)) || (action === "send" && !canSend)) return;
    busyRef.current = true;
    setActivity(action);
    setNotice(null);
    try {
      const isSaving = action === "save" || action === "saveDetails";
      const body = action === "saveDetails" ? { version: quote.version, ...(customer.success ? customer.data : {}) } : action === "save" ? {
        version: quote.version, ...(customer.success ? customer.data : {}),
        lineItems: pricing.items, discountType: draft.discountType,
        discountCents: pricing.discountCents, discountBasisPoints: pricing.discountBasisPoints,
        customerNotes: draft.customerNotes.trim() || null, internalNotes: draft.internalNotes.trim() || null,
      } : { version: quote.version };
      const response = await fetch(`/api/admin/quotes/${quote.id}${isSaving ? "" : `/${action}`}`, {
        method: isSaving ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        if (action === "send" && data.quote) setQuote(data.quote);
        if (response.status === 409) setConflict(true);
        throw new Error(data.error || "This action could not be completed. Please try again.");
      }
      setPreview(null);
      previewRequestRef.current += 1;
      setPreviewLoading(false);
      setRecipientConfirmed(false);
      if (action === "send") {
        setQuote(data.quote ?? { ...quote, status: "quoted", checkoutUrl: data.checkoutUrl, quoteEmailSentAt: new Date(), sendStartedAt: null, version: quote.version + 1 });
        setPreviewOpen(false);
        setNotice({ kind: "success", text: `Quote emailed to ${quote.email} with the secure Revolut payment link.` });
      } else {
        setQuote(data.quote);
        if (action === "saveDetails") {
          const savedDetails = draftFromQuote(data.quote, currentServiceLabel);
          setDraft((current) => ({ ...current, name: savedDetails.name, email: savedDetails.email, phone: savedDetails.phone, serviceType: savedDetails.serviceType, propertySize: savedDetails.propertySize, postcode: savedDetails.postcode, preferredDate: savedDetails.preferredDate, message: savedDetails.message }));
        } else setDraft(draftFromQuote(data.quote, currentServiceLabel));
        setReopenConfirmation(false);
        setNotice({ kind: "success", text: action === "saveDetails" ? "Customer details saved. Any unsaved pricing and notes are still shown in your draft." : action === "save" ? "Changes saved. Preview the client email to review your quote before sending." : "The previous payment link has been cancelled. You can now edit the customer details and revise the quote." });
      }
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to complete this action." });
    } finally {
      busyRef.current = false;
      setActivity(null);
    }
  }

  async function copyPaymentLink() {
    if (!quote.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(quote.checkoutUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setNotice({ kind: "error", text: "The payment link could not be copied. Use Open payment link to access it." });
    }
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.pageHeading}>
        <Link href="/admin" className={styles.backLink}><ArrowLeft size={15} />All enquiries</Link>
        <div className={styles.headingRow}>
          <div>
            <div className={styles.eyebrow}>QUOTE WORKSPACE <span /> {quote.id.slice(0, 8).toUpperCase()}</div>
            <h1>{quote.name}</h1>
            <p>{currentServiceLabel} <span className={styles.bullet}>·</span> {currentPropertyLabel}</p>
          </div>
          <div className={styles.headingStatus}>
            <span className={`${styles.status} ${styles[quote.status]}`}>{quote.status === "paid" ? <BadgeCheck size={14} /> : <span />}{sendingOnServer ? "Sending" : quote.status === "quoted" && !quote.quoteEmailSentAt ? "Email pending" : statusLabels[quote.status]}</span>
            <span className={dirty ? styles.unsaved : styles.saved}>{dirty ? <><span />Unsaved changes</> : <><CheckCheck size={14} />All changes saved</>}</span>
          </div>
        </div>
        <ol className={styles.steps} aria-label="Quote workflow">
          <li className={styles.stepActive}><span>{quote.status !== "pending" ? <Check size={13} /> : "1"}</span>Prepare quote</li>
          <li className={canReview ? styles.stepActive : ""}><span>2</span>Preview email</li>
          <li className={quote.quoteEmailSentAt ? styles.stepActive : ""}><span>{quote.quoteEmailSentAt ? <Check size={13} /> : "3"}</span>Send to client</li>
        </ol>
      </div>

      {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`${styles.notice} ${notice.kind === "error" ? styles.noticeError : styles.noticeSuccess}`}>{notice.kind === "error" ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}<p>{notice.text}</p></div>}
      {conflict && <div role="alert" className={`${styles.notice} ${styles.noticeWarning}`}><AlertCircle size={19} /><div><strong>This enquiry has changed since you opened it.</strong><p>Your edits are still shown. Copy anything you need before loading the latest version; reloading will replace this draft.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>Load latest version</Button></div></div>}
      {sendingOnServer && <div role="status" className={`${styles.notice} ${styles.noticeInfo}`}><Loader2 size={19} className="animate-spin" /><p>A quote is being sent. Editing and sending are paused to prevent duplicate payment links. Refresh this page to see the result.</p></div>}
      {quote.status !== "pending" && !sendingOnServer && <div className={styles.lockBanner}><LockKeyhole size={16} /><p>{quote.status === "quoted" ? "This quote has been sent. To change the customer details or price, revise the quote below." : quote.status === "paid" ? "Payment received. Customer details and pricing are locked to preserve the paid quote." : "This enquiry is cancelled. Its customer details and pricing are locked."}</p></div>}

      <form ref={editorRef} noValidate onSubmit={(event) => { event.preventDefault(); void request("save"); }} className={styles.editorGrid}>
        <div className={styles.sections}>
          <section className={styles.panel} aria-labelledby="customer-heading">
            <div className={styles.sectionHeading}><div className={styles.sectionIcon}><UserRound size={19} /></div><div><h2 id="customer-heading">Customer details</h2><p>Keep the contact details accurate before you send.</p></div><span className={styles.sectionNumber}>01</span></div>
            <fieldset disabled={!editable} className={styles.fields}>
              <legend className="sr-only">Customer contact details</legend>
              <div className={styles.fieldGrid}>
                <div className={styles.fullWidth}><Label htmlFor="customer-name">Full name <span className={styles.required}>*</span></Label><Input id="customer-name" autoComplete="name" value={draft.name} maxLength={120} onChange={(event) => updateDraft("name", event.target.value)} aria-invalid={dirty && Boolean(customerErrors.name)} aria-describedby={dirty && customerErrors.name ? "customer-name-error" : undefined} required />{dirty && customerErrors.name && <p id="customer-name-error" className={styles.fieldError}>{customerErrors.name[0]}</p>}</div>
                <div><Label htmlFor="customer-email">Email address <span className={styles.required}>*</span></Label><Input id="customer-email" type="email" autoComplete="email" value={draft.email} maxLength={254} onChange={(event) => updateDraft("email", event.target.value)} aria-invalid={dirty && Boolean(customerErrors.email)} aria-describedby={dirty && customerErrors.email ? "customer-email-error" : "email-help"} required />{dirty && customerErrors.email ? <p id="customer-email-error" className={styles.fieldError}>{customerErrors.email[0]}</p> : <p id="email-help" className={styles.fieldHint}>The quote and payment link will be sent here.</p>}</div>
                <div><Label htmlFor="customer-phone">Phone number <span className={styles.required}>*</span></Label><Input id="customer-phone" type="tel" autoComplete="tel" value={draft.phone} maxLength={40} onChange={(event) => updateDraft("phone", event.target.value)} aria-invalid={dirty && Boolean(customerErrors.phone)} aria-describedby={dirty && customerErrors.phone ? "customer-phone-error" : undefined} required />{dirty && customerErrors.phone && <p id="customer-phone-error" className={styles.fieldError}>{customerErrors.phone[0]}</p>}</div>
              </div>
            </fieldset>
            {quote.status === "pending" && <div className={styles.detailsFooter}><p>Save the customer’s details at any stage, even before pricing.</p><Button type="button" variant="outline" size="sm" disabled={!editable || !customerDirty || !customer.success} onClick={() => void request("saveDetails")}>{activity === "saveDetails" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save customer details</Button></div>}
          </section>

          <section className={styles.panel} aria-labelledby="request-heading">
            <div className={styles.sectionHeading}><div className={styles.sectionIcon}><Clipboard size={19} /></div><div><h2 id="request-heading">Cleaning requirements</h2><p>Review the space, service and customer’s request.</p></div><span className={styles.sectionNumber}>02</span></div>
            <fieldset disabled={!editable} className={styles.fields}>
              <legend className="sr-only">Cleaning requirements</legend>
              <div className={styles.fieldGrid}>
                <div><Label htmlFor="service-type">Service <span className={styles.required}>*</span></Label><select id="service-type" value={draft.serviceType} onChange={(event) => updateDraft("serviceType", event.target.value)} className={styles.select} required>{Object.entries(SERVICE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
                <div><Label htmlFor="property-size">Property size <span className={styles.required}>*</span></Label><select id="property-size" value={draft.propertySize} onChange={(event) => updateDraft("propertySize", event.target.value)} className={styles.select} required>{Object.entries(PROPERTY_SIZE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
                <div><Label htmlFor="postcode">Postcode <span className={styles.optional}>Optional</span></Label><Input id="postcode" autoComplete="postal-code" value={draft.postcode} maxLength={12} onChange={(event) => updateDraft("postcode", event.target.value.toUpperCase())} /></div>
                <div><Label htmlFor="preferred-date">Preferred date <span className={styles.optional}>Optional</span></Label><Input id="preferred-date" type="date" value={draft.preferredDate} onChange={(event) => updateDraft("preferredDate", event.target.value)} /><p className={styles.fieldHint}>A requested date, subject to availability.</p>{dirty && customerErrors.preferredDate && <p className={styles.fieldError}>{customerErrors.preferredDate[0]}</p>}</div>
                <div className={styles.fullWidth}><Label htmlFor="customer-request">Customer’s request</Label><Textarea id="customer-request" value={draft.message} maxLength={5000} onChange={(event) => updateDraft("message", event.target.value)} placeholder="Access instructions, areas to clean, or details from your conversation." /><p className={styles.fieldHint}>Keep the agreed scope and customer’s requirements up to date.</p></div>
              </div>
            </fieldset>
          </section>

          <section className={styles.panel} aria-labelledby="quote-heading">
            <div className={styles.sectionHeading}><div className={styles.sectionIcon}><FileText size={19} /></div><div><h2 id="quote-heading">Quote & pricing</h2><p>Build a clear breakdown of what’s included. All prices in GBP.</p></div><span className={styles.sectionNumber}>03</span></div>
            <fieldset disabled={!editable} className={styles.fields}>
              <legend className="sr-only">Quote line items and discount</legend>
              <div className={styles.itemList}>
                {draft.items.map((item, index) => {
                  const unitPrice = parseDecimal(item.unitPrice);
                  const lineTotal = unitPrice !== null && /^\d+$/.test(item.quantity) ? unitPrice * Number(item.quantity) : null;
                  return <div key={item.key} className={styles.lineItem}>
                    <div className={styles.itemHeading}><span>ITEM {String(index + 1).padStart(2, "0")}</span><Button type="button" variant="ghost" size="icon" disabled={draft.items.length <= 1 || !editable} className={styles.removeItem} aria-label={`Remove item ${index + 1}`} onClick={() => updateDraft("items", draft.items.filter((row) => row.key !== item.key))}><Trash2 size={15} /></Button></div>
                    <div><Label htmlFor={`${item.key}-description`}>Description</Label><Input id={`${item.key}-description`} value={item.description} maxLength={200} onChange={(event) => updateItem(item.key, "description", event.target.value)} placeholder="e.g. Deep clean — kitchen and bathroom" required /></div>
                    <div className={styles.itemAmounts}>
                      <div><Label htmlFor={`${item.key}-quantity`}>Quantity</Label><Input id={`${item.key}-quantity`} value={item.quantity} type="number" min="1" max="100" step="1" onChange={(event) => updateItem(item.key, "quantity", event.target.value)} required /></div>
                      <div><Label htmlFor={`${item.key}-price`}>Unit price (£)</Label><Input id={`${item.key}-price`} value={item.unitPrice} inputMode="decimal" onChange={(event) => updateItem(item.key, "unitPrice", event.target.value)} placeholder="0.00" required /></div>
                      <div className={styles.lineTotal}><span>Line total</span><strong>{lineTotal !== null ? formatPrice(lineTotal) : "—"}</strong></div>
                    </div>
                  </div>;
                })}
              </div>
              <Button type="button" variant="ghost" size="sm" className={styles.addItem} disabled={draft.items.length >= 20 || !editable} onClick={() => { nextRow.current += 1; updateDraft("items", [...draft.items, { key: `new-${nextRow.current}`, description: "", quantity: "1", unitPrice: "" }]); }}><Plus size={16} />Add line item</Button>
              <div className={styles.discountBox}>
                <div className={styles.discountIntro}><h3>Apply a discount</h3><p>A fixed amount or a percentage of the subtotal.</p></div>
                <div className={styles.discountControls}>
                  <div className={styles.segmented} role="group" aria-label="Discount type"><button type="button" aria-pressed={draft.discountType === "fixed"} onClick={() => { if (draft.discountType !== "fixed") { updateDraft("discountType", "fixed"); updateDraft("discount", "0"); } }} disabled={!editable}>Fixed £</button><button type="button" aria-pressed={draft.discountType === "percentage"} onClick={() => { if (draft.discountType !== "percentage") { updateDraft("discountType", "percentage"); updateDraft("discount", "0"); } }} disabled={!editable}>Percentage %</button></div>
                  <div className={styles.discountValue}><Label htmlFor="discount">{draft.discountType === "percentage" ? "Discount (%)" : "Discount (£)"}</Label><Input id="discount" value={draft.discount} inputMode="decimal" onChange={(event) => updateDraft("discount", event.target.value)} placeholder="0.00" aria-describedby="discount-help" /></div>
                </div>
                <p id="discount-help" className={styles.fieldHint}>{draft.discountType === "percentage" ? `${draft.discount || "0"}% applies to all line items and recalculates when prices change.` : "This amount is deducted once from the subtotal."}{!pricing.error && pricing.discountCents > 0 && <strong className={styles.discountSaving}> Customer saves {formatPrice(pricing.discountCents)}.</strong>}</p>
              </div>
              {pricing.error && <div className={styles.validationMessage}><AlertCircle size={16} /><p>{pricing.error}</p></div>}
            </fieldset>
          </section>

          <section className={styles.panel} aria-labelledby="notes-heading">
            <div className={styles.sectionHeading}><div className={styles.sectionIcon}><FilePenLine size={19} /></div><div><h2 id="notes-heading">Notes & next steps</h2><p>Make your quote personal and keep your team informed.</p></div><span className={styles.sectionNumber}>04</span></div>
            <fieldset disabled={!editable} className={styles.fields}>
              <legend className="sr-only">Customer and internal notes</legend>
              <div><Label htmlFor="customer-notes" className={styles.labelWithIcon}><Mail size={14} />Message for the customer</Label><Textarea id="customer-notes" value={draft.customerNotes} maxLength={5000} onChange={(event) => updateDraft("customerNotes", event.target.value)} placeholder="Explain what’s included, any agreed details, and what happens next." /><p className={styles.fieldHint}>Visible in the quote email. Review the final wording in the preview.</p></div>
              <div className={styles.privateNotes}><Label htmlFor="internal-notes" className={styles.labelWithIcon}><LockKeyhole size={14} />Private team notes <span>ADMIN ONLY</span></Label><Textarea id="internal-notes" value={draft.internalNotes} maxLength={5000} onChange={(event) => updateDraft("internalNotes", event.target.value)} placeholder="Site access, staffing, follow-up reminders or internal instructions." /><p className={styles.fieldHint}>Visible only to your team. These notes never appear in the client email.</p></div>
            </fieldset>
          </section>
          {quote.status === "pending" && <div className={styles.editorFooter}><span>{dirty ? "Your changes have not been saved yet." : "Your latest changes are saved."}</span><Button type="submit" variant="outline" disabled={!editable || !dirty || !validDraft}>{activity === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save changes</Button></div>}
        </div>

        <aside className={styles.summary} aria-label="Quote summary and actions">
          <section className={styles.summaryCard}>
            <div className={styles.summaryHero}><span>QUOTE TOTAL</span><strong aria-live="polite">{pricing.error ? "—" : formatPrice(pricing.total)}</strong><p>Total payable by the customer · GBP</p><span className={styles.paymentBadge}><ShieldCheck size={13} />Secure payment with Revolut</span></div>
            <div className={styles.summaryBody}>
              <dl className={styles.totals}><div><dt>Subtotal</dt><dd>{pricing.subtotal ? formatPrice(pricing.subtotal) : pricing.error ? "—" : formatPrice(0)}</dd></div><div className={!pricing.error && pricing.discountCents > 0 ? styles.discountTotal : ""}><dt>Discount{draft.discountType === "percentage" ? ` (${draft.discount || "0"}%)` : ""}</dt><dd>{pricing.error ? "—" : `−${formatPrice(pricing.discountCents)}`}</dd></div><div className={styles.totalRow}><dt>Total</dt><dd>{pricing.error ? "—" : formatPrice(pricing.total)}</dd></div></dl>
              <div className={styles.recipient}><div className={styles.recipientIcon}><UserRound size={17} /></div><div><span>PREPARED FOR</span><strong>{draft.name || "Customer name"}</strong><p>{draft.email || "Add an email address"}</p></div></div>
              {quote.status === "pending" && <Button type="submit" variant="outline" className={styles.saveButton} disabled={!editable || !dirty || !validDraft}>{activity === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{activity === "save" ? "Saving changes…" : "Save changes"}</Button>}
              {(quote.status === "pending" || quote.status === "quoted") && <><Button type="button" className={`${buttonClass} ${styles.reviewButton}`} disabled={!canReview || previewLoading} onClick={() => void reviewEmail()}>{previewLoading ? <Loader2 size={17} className="animate-spin" /> : <Eye size={17} />}Preview client email<ArrowRight size={15} /></Button><p className={styles.actionHelp}>{dirty ? "Save your changes to preview and send the latest details." : !validDraft ? "Complete the contact details and pricing to preview the quote." : "Review the exact email, then choose when to send it."}</p></>}
              {quote.status === "paid" && <p className={styles.paidMessage}><CheckCircle2 size={19} />Payment received.<br />This quote is complete and locked.</p>}
              {quote.status === "cancelled" && <p className={styles.actionHelp}>This enquiry is cancelled. A quote cannot be sent.</p>}
            </div>
          </section>

          {quote.checkoutUrl && quote.status === "quoted" && <section className={styles.panel}><div className={styles.smallCardContent}><h2><ShieldCheck size={17} />Payment link</h2><p>The active Revolut checkout uses the saved quote price.</p><div className={styles.paymentActions}><Button type="button" variant="outline" size="sm" onClick={() => void copyPaymentLink()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy link"}</Button><a href={quote.checkoutUrl} target="_blank" rel="noopener noreferrer">Open link<ExternalLink size={13} /></a></div></div></section>}

          {quote.status === "quoted" && <section className={styles.panel}><div className={styles.smallCardContent}><h2><FilePenLine size={17} />Revise this quote</h2><p>Update the customer details, scope or price. The current payment link is cancelled before editing.</p>{reopenConfirmation ? <div className={styles.reopenConfirm}><strong>Cancel the current link and reopen?</strong><Button type="button" variant="outline" size="sm" disabled={Boolean(activity) || conflict || sendingOnServer} onClick={() => void request("reopen")}>{activity === "reopen" ? <Loader2 size={14} className="animate-spin" /> : <FilePenLine size={14} />}Cancel link & revise</Button><button type="button" disabled={Boolean(activity)} onClick={() => setReopenConfirmation(false)}>Keep current quote</button></div> : <Button type="button" variant="outline" size="sm" className={styles.reviseButton} disabled={Boolean(activity) || conflict || sendingOnServer} onClick={() => setReopenConfirmation(true)}>Revise quote<ChevronRight size={14} /></Button>}</div></section>}

          <section className={`${styles.panel} ${styles.activityCard}`}><h2>Quote activity</h2><ol><li><span className={styles.timelineDot} /><div><strong>Enquiry received</strong><p>{formatDate(quote.createdAt)}</p></div></li>{quote.version > 0 && <li><span className={styles.timelineDot} /><div><strong>Last updated</strong><p>{formatDate(quote.updatedAt)}</p></div></li>}{quote.quoteEmailSentAt && <li><span className={styles.timelineDotActive} /><div><strong>Quote emailed to customer</strong><p>{formatDate(quote.quoteEmailSentAt)}</p></div></li>}{quote.status === "paid" && <li><span className={styles.timelineDotActive} /><div><strong>Payment received</strong><p>Confirmed by Revolut</p></div></li>}</ol></section>
          <p className={styles.securityNote}><LockKeyhole size={14} />Customer data is restricted to your admin team. Payment details are handled by Revolut.</p>
        </aside>
      </form>

      <Dialog.Root open={previewOpen} onOpenChange={(open) => { if (open) setPreviewOpen(true); else closePreview(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.previewOverlay} />
          <Dialog.Content className={styles.previewDialog}>
            <div className={styles.previewHeader}><div className={styles.previewTitle}><span><Mail size={19} /></span><div><Dialog.Title>Review client email</Dialog.Title><Dialog.Description>Check the recipient, cleaning details and final price before sending.</Dialog.Description></div></div><Dialog.Close asChild><Button variant="ghost" size="icon" disabled={Boolean(activity)} aria-label="Close email preview"><X size={20} /></Button></Dialog.Close></div>
            <div className={styles.previewMeta}><div><span>TO</span><strong>{preview?.to ?? quote.email}</strong></div><div><span>FROM</span><p>{preview?.from ?? "GoodyCleaning <support@goodyvan.com>"}</p></div><div><span>SUBJECT</span><p>{preview?.subject ?? "Your GoodyCleaning quote"}</p></div></div>
            <div className={styles.previewToolbar}><span><ShieldCheck size={13} />{preview ? "Exact email preview · Links disabled" : "Preparing your email"}</span><div className={styles.deviceControls} role="group" aria-label="Email preview size"><button type="button" aria-label="Desktop email preview" aria-pressed={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}><Monitor size={16} /></button><button type="button" aria-label="Mobile email preview" aria-pressed={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}><Smartphone size={16} /></button></div></div>
            <div className={styles.previewCanvas}>
              {previewLoading ? <div className={styles.previewPlaceholder} role="status"><Loader2 size={27} className="animate-spin" /><strong>Preparing your email preview</strong><p>Loading the saved details and branded quote.</p></div> : previewError ? <div className={styles.previewPlaceholder} role="alert"><AlertCircle size={27} /><strong>Email preview unavailable</strong><p>{previewError}</p><Button type="button" variant="outline" size="sm" disabled={!canReview} onClick={() => void reviewEmail()}>Try again</Button></div> : preview ? <div className={`${styles.emailFrame} ${previewDevice === "mobile" ? styles.emailFrameMobile : ""}`}><iframe title="Exact customer quote email preview" srcDoc={preview.html} sandbox="" referrerPolicy="no-referrer" /></div> : null}
            </div>
            <div className={styles.previewFooter}>
              {notice?.kind === "error" && <p role="alert" className={styles.previewSendError}><AlertCircle size={16} />{notice.text}</p>}
              <label className={styles.confirmRecipient}><input type="checkbox" checked={recipientConfirmed} disabled={!preview || previewLoading || Boolean(activity)} onChange={(event) => setRecipientConfirmed(event.target.checked)} /><span>I have reviewed the details. Send this quote to <strong>{quote.email}</strong>.</span></label>
              <div className={styles.previewFooterActions}><p>{quote.status === "quoted" ? "The existing Revolut link and saved price will be reused." : "A secure Revolut payment link will be included when sent."}</p><Button type="button" className={buttonClass} disabled={!canSend || Boolean(activity)} onClick={() => void request("send")}>{activity === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{activity === "send" ? "Sending quote…" : quote.status === "quoted" && quote.quoteEmailSentAt ? "Resend quote" : "Send quote to client"}</Button></div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

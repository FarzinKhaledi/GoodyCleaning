"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { siteConfig } from "@/lib/config";
import { getPrice, isBigJob, PROPERTY_SIZE_LABELS, SERVICE_LABELS, type PropertySize, type ServiceType } from "@/lib/pricing";
import { bookingSchema, getBookingMinDate, type BookingFormData } from "@/lib/validations";
import { formatPrice } from "@/lib/utils";
import { ArrowUpRight, Check, CheckCircle2, Loader2, LockKeyhole, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { EnquiryBooking } from "./EnquiryBooking";

type SubmissionStatus = { type: "success" | "error"; message: string } | null;

function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, value);
}

function isPropertySize(value: unknown): value is PropertySize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROPERTY_SIZE_LABELS, value);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs font-medium text-red-600">{message}</p> : null;
}

const inputClassName = "rounded-xl border-[#e1e6e9] bg-[#fbfcfa] text-[#102c43] placeholder:text-[#89949d] focus-visible:ring-[#2457e8]/40";

export function BookingForm() {
  return siteConfig.booking.instantEnabled ? <InstantBookingForm /> : <EnquiryBooking />;
}

function InstantBookingForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>(null);
  const [minimumDate] = useState(getBookingMinDate);
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { name: "", email: "", phone: "", serviceType: "deep", propertySize: "1bed", preferredDate: "", message: "" },
  });
  const serviceType = useWatch({ control: form.control, name: "serviceType" });
  const propertySize = useWatch({ control: form.control, name: "propertySize" });
  const bigJob = isBigJob(propertySize);
  const price = getPrice(serviceType, propertySize);
  const errors = form.formState.errors;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      const selection = typeof detail === "string" ? { service: detail } : detail;
      if (!selection || typeof selection !== "object") return;
      if ("service" in selection && isServiceType(selection.service)) {
        form.setValue("serviceType", selection.service, { shouldDirty: true, shouldValidate: true });
      }
      if ("propertySize" in selection && isPropertySize(selection.propertySize)) {
        form.setValue("propertySize", selection.propertySize, { shouldDirty: true, shouldValidate: true });
      }
    };
    window.addEventListener("select-service", handler);
    return () => window.removeEventListener("select-service", handler);
  }, [form]);

  async function onSubmit(data: BookingFormData) {
    if (loading) return;
    setLoading(true);
    setStatus(null);
    try {
      const quoteRequested = isBigJob(data.propertySize);
      const response = await fetch(quoteRequested ? "/api/quotes/request" : "/api/checkout/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload: unknown = await response.json().catch(() => null);
      const result = payload && typeof payload === "object"
        ? payload as { error?: unknown; checkoutUrl?: unknown }
        : {};
      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "We couldn't send your booking. Please try again.");
      }
      if (quoteRequested) {
        setStatus({ type: "success", message: "Your quote request is in! We'll review your space and email you a personalised price shortly." });
        form.reset({ ...data, name: "", email: "", phone: "", preferredDate: "", message: "" });
      } else {
        if (typeof result.checkoutUrl !== "string" || !result.checkoutUrl.trim()) {
          throw new Error("We couldn't open secure checkout. Please try again or get in touch below.");
        }
        window.location.assign(result.checkoutUrl);
      }
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="booking" className="section-shell section-pad scroll-mt-24 text-[#102c43]" aria-labelledby="booking-title">
      <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div data-reveal className="lg:sticky lg:top-32 lg:py-8">
          <div className="mb-6 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2457e8]">
            <span className="h-2 w-2 rounded-full bg-[#2457e8]" />A little less on your list
          </div>
          <h2 id="booking-title" className="max-w-lg text-[clamp(2.6rem,5vw,4.5rem)] font-semibold leading-[1.06] tracking-[-0.055em]">
            A fresher space <span className="text-[#2457e8]">starts here.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#687781] sm:text-lg">Tell us what needs a little love. Get an instant price for your home, or a tailored quote for a bigger space. We&apos;ll take care of the rest.</p>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            {["Simple online booking", "Secure checkout"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6f28b]"><Check className="h-3 w-3" aria-hidden="true" /></span>{item}</span>
            ))}
          </div>

          <div className="mt-12 border-t border-[#dfe5e3] pt-8">
            <p className="mb-5 text-sm font-semibold">Prefer a friendly chat?</p>
            <div className="space-y-4 text-sm text-[#687781]">
              <a href={`tel:${siteConfig.contact.phone}`} className="group flex w-fit items-center gap-3 transition-colors hover:text-[#2457e8]">
                <Phone className="h-4 w-4 text-[#2457e8]" aria-hidden="true" /><span>{siteConfig.contact.phone}</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
              <a href={`mailto:${siteConfig.contact.email}`} className="flex w-fit items-center gap-3 break-all transition-colors hover:text-[#2457e8]"><Mail className="h-4 w-4 shrink-0 text-[#2457e8]" aria-hidden="true" />{siteConfig.contact.email}</a>
              <p className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0 text-[#2457e8]" aria-hidden="true" />{siteConfig.contact.address}</p>
            </div>
          </div>

          <div className="mt-10 flex max-w-md items-center gap-4 rounded-2xl bg-[#edf2e3] p-5">
            <Sparkles className="h-7 w-7 shrink-0 text-[#557631]" aria-hidden="true" />
            <div><p className="font-semibold tracking-tight">More living. Less cleaning.</p><p className="mt-1 text-sm text-[#687781]">That&apos;s the Goody feeling.</p></div>
          </div>
        </div>

        <div data-reveal className="rounded-[2rem] border border-[#e6eae6] bg-white p-6 shadow-[0_24px_80px_-36px_rgba(16,44,67,0.2)] sm:p-9">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#687781]">Your clean, your way</p><h3 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Tell us about your space</h3></div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f4ff] text-[#2457e8]"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate aria-busy={loading}>
            <fieldset disabled={loading} className="min-w-0 space-y-5 disabled:opacity-70">
              <legend className="sr-only">Booking details</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-[#102c43]">Full name</Label>
                  <Input id="name" autoComplete="name" placeholder="Your name" className={inputClassName} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} {...form.register("name")} />
                  <FieldError id="name-error" message={errors.name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#102c43]">Email address</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputClassName} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...form.register("email")} />
                  <FieldError id="email-error" message={errors.email?.message} />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold text-[#102c43]">Phone number</Label>
                  <Input id="phone" type="tel" autoComplete="tel" placeholder="Your contact number" className={inputClassName} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} {...form.register("phone")} />
                  <FieldError id="phone-error" message={errors.phone?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredDate" className="text-xs font-semibold text-[#102c43]">Preferred date <span className="font-normal text-[#687781]">(optional)</span></Label>
                  <Input id="preferredDate" type="date" min={minimumDate} className={inputClassName} aria-invalid={!!errors.preferredDate} aria-describedby={errors.preferredDate ? "date-error" : undefined} {...form.register("preferredDate")} />
                  <FieldError id="date-error" message={errors.preferredDate?.message} />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serviceType" className="text-xs font-semibold text-[#102c43]">What needs cleaning?</Label>
                  <Select name="serviceType" value={serviceType} onValueChange={(value) => { if (isServiceType(value)) form.setValue("serviceType", value, { shouldDirty: true, shouldValidate: true }); }}>
                    <SelectTrigger id="serviceType" className={`${inputClassName} text-left focus:ring-[#2457e8]/40 [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0`} aria-invalid={!!errors.serviceType} aria-describedby={errors.serviceType ? "service-error" : undefined}><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(SERVICE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldError id="service-error" message={errors.serviceType?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertySize" className="text-xs font-semibold text-[#102c43]">Size of your space</Label>
                  <Select name="propertySize" value={propertySize} onValueChange={(value) => { if (isPropertySize(value)) form.setValue("propertySize", value, { shouldDirty: true, shouldValidate: true }); }}>
                    <SelectTrigger id="propertySize" className={`${inputClassName} text-left focus:ring-[#2457e8]/40 [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0`} aria-invalid={!!errors.propertySize} aria-describedby={errors.propertySize ? "size-error" : undefined}><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROPERTY_SIZE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldError id="size-error" message={errors.propertySize?.message} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-semibold text-[#102c43]">Anything else we should know? <span className="font-normal text-[#687781]">(optional)</span></Label>
                <Textarea id="message" rows={3} placeholder="Special requests, access details, or a little about your space…" className={`${inputClassName} min-h-24 resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} {...form.register("message")} />
                <FieldError id="message-error" message={errors.message?.message} />
              </div>

              <div aria-live="polite" aria-atomic="true" className="rounded-2xl bg-[#f3f6ed] px-5 py-4">
                {bigJob ? (
                  <div><p className="text-sm font-semibold">A clean tailored to your space</p><p className="mt-1 text-xs leading-relaxed text-[#687781]">Larger homes and commercial spaces receive a personalised quote. Send your details to get started.</p></div>
                ) : price ? (
                  <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium text-[#687781]">Your estimated clean</p><p className="mt-1 text-sm font-semibold">{PROPERTY_SIZE_LABELS[propertySize]}</p></div><span className="text-3xl font-semibold tracking-[-0.05em]">{formatPrice(price)}</span></div>
                ) : null}
              </div>

              <Button type="submit" size="lg" className="group h-14 w-full bg-[#2457e8] px-5 text-white shadow-none transition-all hover:-translate-y-0.5 hover:bg-[#1948cf] hover:shadow-lg hover:shadow-[#2457e8]/15 focus-visible:ring-[#2457e8]/40 motion-reduce:hover:translate-y-0" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{bigJob ? "Sending your request…" : "Opening secure checkout…"}</> : <>{bigJob ? "Get my personalised quote" : "Let's book your clean"}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></>}
              </Button>
            </fieldset>

            {status && (
              <div role={status.type === "error" ? "alert" : "status"} className={`mt-5 flex items-start gap-2.5 rounded-xl p-4 text-sm leading-relaxed ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-[#edf6df] text-[#375a20]"}`}>
                {status.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}<p>{status.message}</p>
              </div>
            )}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#687781]"><LockKeyhole className="h-3 w-3 shrink-0" aria-hidden="true" />Secure checkout. Your details are in safe hands.</p>
          </form>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowUpRight, Check, CheckCircle2, Loader2, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { siteConfig } from "@/lib/config";
import {
  PROPERTY_SIZE_LABELS,
  SERVICE_LABELS,
  type PropertySize,
  type ServiceType,
} from "@/lib/pricing";
import { enquirySchema, getBookingMinDate, type EnquiryFormData } from "@/lib/validations";

type EnquiryFormInput = z.input<typeof enquirySchema>;
type SubmissionStatus = {
  type: "success" | "error";
  message: string;
  showContact?: boolean;
} | null;

const enquiryFields = ["name", "email", "phone", "serviceType", "propertySize", "postcode", "preferredDate", "message"] as const;
const submissionError = "We couldn't confirm your enquiry was sent. Your details are still here. Please try again or call our cleaning team.";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs font-medium text-red-600">{message}</p> : null;
}

function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, value);
}

function isPropertySize(value: unknown): value is PropertySize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROPERTY_SIZE_LABELS, value);
}

const inputClassName = "rounded-xl border-[#e1e6e9] bg-[#fbfcfa] text-[#102c43] placeholder:text-[#89949d] focus-visible:ring-[#2457e8]/40";
const selectClassName = `${inputClassName} text-left focus:ring-[#2457e8]/40 [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0`;

export function EnquiryBooking() {
  const [status, setStatus] = useState<SubmissionStatus>(null);
  const [minimumDate] = useState(getBookingMinDate);
  const submissionInFlight = useRef(false);
  const form = useForm<EnquiryFormInput, unknown, EnquiryFormData>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      serviceType: "deep",
      propertySize: "1bed",
      postcode: "",
      preferredDate: "",
      message: "",
      website: "",
    },
  });
  const serviceType = useWatch({ control: form.control, name: "serviceType" });
  const propertySize = useWatch({ control: form.control, name: "propertySize" });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    const handler = (event: Event) => {
      if (submissionInFlight.current) return;
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

  async function onSubmit(data: EnquiryFormData) {
    setStatus(null);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload: unknown = await response.json().catch(() => null);
      const result = payload && typeof payload === "object"
        ? payload as { success?: unknown; error?: unknown; fieldErrors?: unknown }
        : {};

      if (!response.ok || result.success !== true) {
        if (response.status === 400 && result.fieldErrors && typeof result.fieldErrors === "object") {
          const fieldErrors = result.fieldErrors as Record<string, unknown>;
          let focusFirstError = true;
          for (const field of enquiryFields) {
            const messages = fieldErrors[field];
            const message = typeof messages === "string"
              ? messages
              : Array.isArray(messages) && typeof messages[0] === "string" ? messages[0] : null;
            if (message) {
              form.setError(field, { type: "server", message }, { shouldFocus: focusFirstError });
              focusFirstError = false;
            }
          }
        }
        setStatus({
          type: "error",
          message: response.status === 400
            ? typeof result.error === "string" ? result.error : "Please check your details and try again."
            : submissionError,
          showContact: response.status !== 400,
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Thank you — your enquiry has been sent. Our team will be in touch to discuss your quote and confirm availability and cleaning details.",
      });
      form.reset({
        name: "",
        email: "",
        phone: "",
        serviceType: data.serviceType,
        propertySize: data.propertySize,
        postcode: "",
        preferredDate: "",
        message: "",
        website: "",
      });
    } catch {
      setStatus({ type: "error", message: submissionError, showContact: true });
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
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#687781] sm:text-lg">
            Get a tailored quote for your space. Our team will confirm price, availability, and cleaning details.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            {["A quote that fits your space", "A real person to help"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d6f28b]"><Check className="h-3 w-3" aria-hidden="true" /></span>
                {item}
              </span>
            ))}
          </div>

          <div className="mt-12 border-t border-[#dfe5e3] pt-8">
            <p className="mb-5 text-sm font-semibold">Prefer a friendly chat?</p>
            <div className="space-y-4 text-sm text-[#687781]">
              <a href={`tel:${siteConfig.contact.mobileE164}`} className="group flex w-fit items-center gap-3 transition-colors hover:text-[#2457e8]">
                <Phone className="h-4 w-4 text-[#2457e8]" aria-hidden="true" />
                <span>Cleaning team: <span className="font-semibold text-[#102c43]">{siteConfig.contact.mobile}</span></span>
                <ArrowUpRight className="h-4 w-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} className="flex w-fit items-center gap-3 transition-colors hover:text-[#2457e8]">
                <Phone className="h-4 w-4 text-[#2457e8]" aria-hidden="true" />
                <span>Or call {siteConfig.contact.phone}</span>
              </a>
              <a href={`mailto:${siteConfig.contact.email}`} className="flex w-fit items-center gap-3 break-all transition-colors hover:text-[#2457e8]">
                <Mail className="h-4 w-4 shrink-0 text-[#2457e8]" aria-hidden="true" />{siteConfig.contact.email}
              </a>
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
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#687781]">Your clean, your way</p>
              <h3 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Tell us about your space</h3>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f4ff] text-[#2457e8]"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
          </div>

          <form
            noValidate
            aria-busy={isSubmitting}
            onSubmit={async (event) => {
              event.preventDefault();
              if (submissionInFlight.current) return;
              submissionInFlight.current = true;
              try {
                await form.handleSubmit(onSubmit, () => setStatus({ type: "error", message: "Please check the highlighted details before sending your enquiry." }))(event);
              } finally {
                submissionInFlight.current = false;
              }
            }}
          >
            <fieldset disabled={isSubmitting} className="min-w-0 space-y-5 disabled:opacity-70">
              <legend className="sr-only">Cleaning enquiry details</legend>
              <p className="text-xs text-[#687781]">All fields are required unless marked optional.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enquiry-name" className="text-xs font-semibold text-[#102c43]">Full name</Label>
                  <Input id="enquiry-name" autoComplete="name" required maxLength={120} placeholder="Your name" className={inputClassName} aria-invalid={!!errors.name} aria-describedby={errors.name ? "enquiry-name-error" : undefined} {...form.register("name")} />
                  <FieldError id="enquiry-name-error" message={errors.name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enquiry-email" className="text-xs font-semibold text-[#102c43]">Email address</Label>
                  <Input id="enquiry-email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" className={inputClassName} aria-invalid={!!errors.email} aria-describedby={errors.email ? "enquiry-email-error" : undefined} {...form.register("email")} />
                  <FieldError id="enquiry-email-error" message={errors.email?.message} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enquiry-phone" className="text-xs font-semibold text-[#102c43]">Phone number</Label>
                <Input id="enquiry-phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="Your contact number" className={inputClassName} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "enquiry-phone-error" : undefined} {...form.register("phone")} />
                <FieldError id="enquiry-phone-error" message={errors.phone?.message} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enquiry-service" className="text-xs font-semibold text-[#102c43]">What needs cleaning?</Label>
                  <Select name="serviceType" required disabled={isSubmitting} value={serviceType} onValueChange={(value) => { if (isServiceType(value)) form.setValue("serviceType", value, { shouldDirty: true, shouldValidate: true }); }}>
                    <SelectTrigger id="enquiry-service" className={selectClassName} aria-invalid={!!errors.serviceType} aria-describedby={errors.serviceType ? "enquiry-service-error" : undefined}><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(SERVICE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldError id="enquiry-service-error" message={errors.serviceType?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enquiry-size" className="text-xs font-semibold text-[#102c43]">Size of your space</Label>
                  <Select name="propertySize" required disabled={isSubmitting} value={propertySize} onValueChange={(value) => { if (isPropertySize(value)) form.setValue("propertySize", value, { shouldDirty: true, shouldValidate: true }); }}>
                    <SelectTrigger id="enquiry-size" className={selectClassName} aria-invalid={!!errors.propertySize} aria-describedby={errors.propertySize ? "enquiry-size-error" : undefined}><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROPERTY_SIZE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldError id="enquiry-size-error" message={errors.propertySize?.message} />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enquiry-postcode" className="text-xs font-semibold text-[#102c43]">Postcode <span className="font-normal text-[#687781]">(optional)</span></Label>
                  <Input id="enquiry-postcode" autoComplete="postal-code" placeholder="e.g. SW1A 1AA" maxLength={12} className={inputClassName} aria-invalid={!!errors.postcode} aria-describedby={errors.postcode ? "enquiry-postcode-error" : undefined} {...form.register("postcode")} />
                  <FieldError id="enquiry-postcode-error" message={errors.postcode?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enquiry-date" className="text-xs font-semibold text-[#102c43]">Preferred date <span className="font-normal text-[#687781]">(optional)</span></Label>
                  <Input id="enquiry-date" type="date" min={minimumDate} className={inputClassName} aria-invalid={!!errors.preferredDate} aria-describedby={errors.preferredDate ? "enquiry-date-note enquiry-date-error" : "enquiry-date-note"} {...form.register("preferredDate")} />
                  <FieldError id="enquiry-date-error" message={errors.preferredDate?.message} />
                </div>
              </div>
              <p id="enquiry-date-note" className="-mt-2 text-xs leading-relaxed text-[#687781]">We&apos;ll confirm availability and agree a date with you.</p>

              <div className="space-y-2">
                <Label htmlFor="enquiry-message" className="text-xs font-semibold text-[#102c43]">Anything else we should know? <span className="font-normal text-[#687781]">(optional)</span></Label>
                <Textarea id="enquiry-message" rows={4} maxLength={5000} placeholder="Tell us about your space, any special requests, or access details…" className={`${inputClassName} min-h-28 resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "enquiry-message-error" : undefined} {...form.register("message")} />
                <FieldError id="enquiry-message-error" message={errors.message?.message} />
              </div>
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <Label htmlFor="enquiry-website">Website</Label>
                <Input id="enquiry-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
              </div>

              <div className="rounded-2xl bg-[#f3f6ed] px-5 py-4">
                <p className="text-sm font-semibold">A quote built around your space</p>
                <p className="mt-1 text-xs leading-relaxed text-[#687781]">Our team will review your enquiry and confirm your price, availability, and cleaning details before you book.</p>
              </div>

              <Button type="submit" disabled={isSubmitting} size="lg" className="group h-14 w-full bg-[#2457e8] px-5 text-white shadow-none transition-all hover:bg-[#1948cf] hover:shadow-lg hover:shadow-[#2457e8]/15 focus-visible:ring-[#2457e8]/40 motion-safe:hover:-translate-y-0.5">
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Sending your enquiry…</> : <>Send enquiry<ArrowUpRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" /></>}
              </Button>
            </fieldset>

            {status && (
              <div role={status.type === "error" ? "alert" : "status"} className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-[#edf6df] text-[#375a20]"}`}>
                <div className="flex items-start gap-2.5">
                  {status.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <p>{status.message}</p>
                </div>
                {status.showContact && <p className="mt-2"><a href={`tel:${siteConfig.contact.mobileE164}`} className="font-semibold underline underline-offset-4">Call {siteConfig.contact.mobile}</a><span className="mx-1">or</span><a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">{siteConfig.contact.phone}</a>.</p>}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

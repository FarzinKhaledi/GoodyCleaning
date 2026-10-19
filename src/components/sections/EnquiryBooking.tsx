"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Mail, MapPin, Phone, Sparkles } from "lucide-react";
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
import { getBookingMinDate } from "@/lib/validations";

function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SERVICE_LABELS, value);
}

function isPropertySize(value: unknown): value is PropertySize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROPERTY_SIZE_LABELS, value);
}

const inputClassName = "rounded-xl border-[#e1e6e9] bg-[#fbfcfa] text-[#102c43] placeholder:text-[#89949d] focus-visible:ring-[#2457e8]/40";
const selectClassName = `${inputClassName} text-left focus:ring-[#2457e8]/40 [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0`;

export function EnquiryBooking() {
  const [serviceType, setServiceType] = useState<ServiceType>("deep");
  const [propertySize, setPropertySize] = useState<PropertySize>("1bed");
  const [postcode, setPostcode] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [minimumDate] = useState(getBookingMinDate);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      const selection = typeof detail === "string" ? { service: detail } : detail;
      if (!selection || typeof selection !== "object") return;
      if ("service" in selection && isServiceType(selection.service)) {
        setServiceType(selection.service);
      }
      if ("propertySize" in selection && isPropertySize(selection.propertySize)) {
        setPropertySize(selection.propertySize);
      }
    };
    window.addEventListener("select-service", handler);
    return () => window.removeEventListener("select-service", handler);
  }, []);

  const subject = `GoodyCleaning quote: ${SERVICE_LABELS[serviceType]}`;
  const body = [
    "Hello GoodyCleaning,",
    "",
    "I'd like a cleaning quote for my space.",
    `Service: ${SERVICE_LABELS[serviceType]}`,
    `Property size: ${PROPERTY_SIZE_LABELS[propertySize]}`,
    ...(postcode.trim() ? [`Postcode: ${postcode.trim()}`] : []),
    ...(preferredDate ? [`Preferred date: ${preferredDate} (subject to availability)`] : []),
    ...(message.trim() ? ["", "Additional details:", message.trim()] : []),
    "",
    "Please confirm the price, availability, and cleaning details.",
    "",
    "Name: ",
    "Contact number: ",
  ].join("\n");
  const enquiryHref = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

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

          <fieldset className="min-w-0 space-y-5">
            <legend className="sr-only">Cleaning enquiry details</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enquiry-service" className="text-xs font-semibold text-[#102c43]">What needs cleaning?</Label>
                <Select value={serviceType} onValueChange={(value) => { if (isServiceType(value)) setServiceType(value); }}>
                  <SelectTrigger id="enquiry-service" className={selectClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SERVICE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enquiry-size" className="text-xs font-semibold text-[#102c43]">Size of your space</Label>
                <Select value={propertySize} onValueChange={(value) => { if (isPropertySize(value)) setPropertySize(value); }}>
                  <SelectTrigger id="enquiry-size" className={selectClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PROPERTY_SIZE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enquiry-postcode" className="text-xs font-semibold text-[#102c43]">Postcode <span className="font-normal text-[#687781]">(optional)</span></Label>
                <Input id="enquiry-postcode" autoComplete="postal-code" placeholder="e.g. SW1A 1AA" maxLength={12} value={postcode} onChange={(event) => setPostcode(event.target.value)} className={inputClassName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enquiry-date" className="text-xs font-semibold text-[#102c43]">Preferred date <span className="font-normal text-[#687781]">(optional)</span></Label>
                <Input id="enquiry-date" type="date" min={minimumDate} value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} className={inputClassName} aria-describedby="enquiry-date-note" />
              </div>
            </div>
            <p id="enquiry-date-note" className="-mt-2 text-xs leading-relaxed text-[#687781]">We&apos;ll confirm availability and agree a date with you.</p>

            <div className="space-y-2">
              <Label htmlFor="enquiry-message" className="text-xs font-semibold text-[#102c43]">Anything else we should know? <span className="font-normal text-[#687781]">(optional)</span></Label>
              <Textarea id="enquiry-message" rows={4} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us about your space, any special requests, or access details…" className={`${inputClassName} min-h-28 resize-y`} />
            </div>
          </fieldset>

          <div className="my-6 rounded-2xl bg-[#f3f6ed] px-5 py-4">
            <p className="text-sm font-semibold">A quote built around your space</p>
            <p className="mt-1 text-xs leading-relaxed text-[#687781]">Our team will review your enquiry and confirm your price, availability, and cleaning details before you book.</p>
          </div>

          <Button asChild size="lg" className="group h-14 w-full bg-[#2457e8] px-5 text-white shadow-none transition-all hover:bg-[#1948cf] hover:shadow-lg hover:shadow-[#2457e8]/15 focus-visible:ring-[#2457e8]/40 motion-safe:hover:-translate-y-0.5">
            <a href={enquiryHref} aria-describedby="enquiry-email-note">Email us for a quote<ArrowUpRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" /></a>
          </Button>
          <p id="enquiry-email-note" className="mt-4 text-center text-xs leading-relaxed text-[#687781]">Opens your email app with your details ready to review and send.</p>
        </div>
      </div>
    </section>
  );
}

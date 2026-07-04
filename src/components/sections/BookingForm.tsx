"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { siteConfig } from "@/lib/config";
import {
  getPrice,
  isBigJob,
  PROPERTY_SIZE_LABELS,
  SERVICE_LABELS,
  type PropertySize,
  type ServiceType,
} from "@/lib/pricing";
import { bookingSchema, type BookingFormData } from "@/lib/validations";
import { formatPrice } from "@/lib/utils";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";

export function BookingForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      serviceType: "deep",
      propertySize: "1bed",
      preferredDate: "",
      message: "",
    },
  });

  const serviceType = form.watch("serviceType") as ServiceType;
  const propertySize = form.watch("propertySize") as PropertySize;
  const bigJob = isBigJob(propertySize);
  const price = getPrice(serviceType, propertySize);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ServiceType>).detail;
      if (detail) form.setValue("serviceType", detail);
    };
    window.addEventListener("select-service", handler);
    return () => window.removeEventListener("select-service", handler);
  }, [form]);

  async function onSubmit(data: BookingFormData) {
    setLoading(true);
    try {
      const endpoint = bigJob ? "/api/quotes/request" : "/api/checkout/instant";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Something went wrong");
      }

      if (bigJob) {
        toast({
          title: "Quote request sent!",
          description:
            "We'll review your request and send you a personalised quote shortly.",
        });
        form.reset();
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="booking" className="relative px-6 py-32">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Book Your Clean
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Get an instant price or request a custom quote
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-5">
          <Card className="border-white/10 bg-white/95 lg:col-span-3">
            <CardHeader>
              <CardTitle>Request a Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...form.register("email")} />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" {...form.register("phone")} />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredDate">Preferred Date</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      {...form.register("preferredDate")}
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <Select
                      value={serviceType}
                      onValueChange={(v) =>
                        form.setValue("serviceType", v as ServiceType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Property Size</Label>
                    <Select
                      value={propertySize}
                      onValueChange={(v) =>
                        form.setValue("propertySize", v as PropertySize)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROPERTY_SIZE_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Details</Label>
                  <Textarea
                    id="message"
                    placeholder="Any special requirements or access instructions..."
                    {...form.register("message")}
                  />
                </div>

                <div className="rounded-xl bg-navy/5 p-4">
                  {bigJob ? (
                    <p className="text-sm text-slate-600">
                      Large properties and commercial spaces require a custom
                      quote. We&apos;ll review your request and email you a
                      personalised price within 24 hours.
                    </p>
                  ) : price ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Estimated price for {PROPERTY_SIZE_LABELS[propertySize]}
                      </span>
                      <span className="text-2xl font-bold text-navy">
                        {formatPrice(price)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bigJob ? "Request Quote" : `Book Now — ${price ? formatPrice(price) : ""}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-white/10 bg-white/10 backdrop-blur">
              <CardContent className="space-y-6 p-6">
                <h3 className="text-xl font-bold text-white">Contact Us</h3>
                <div className="space-y-4">
                  <a
                    href={`tel:${siteConfig.contact.phone}`}
                    className="flex items-center gap-3 text-white/80 hover:text-mint"
                  >
                    <Phone className="h-5 w-5 text-mint" />
                    {siteConfig.contact.phone}
                  </a>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="flex items-center gap-3 text-white/80 hover:text-mint"
                  >
                    <Mail className="h-5 w-5 text-mint" />
                    {siteConfig.contact.email}
                  </a>
                  <div className="flex items-start gap-3 text-white/80">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                    {siteConfig.contact.address}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-mint/20 bg-mint/10 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-bold text-white">
                  Secure Payment
                </h3>
                <p className="text-sm text-white/70">
                  Pay securely with card, Apple Pay, Google Pay, or Revolut Pay
                  via our encrypted checkout.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { formatPrice, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft } from "lucide-react";
import type { Quote } from "@/lib/db/schema";

interface QuoteDetailProps {
  quote: Quote;
  serviceLabel: string;
  propertyLabel: string;
}

export function QuoteDetailClient({
  quote,
  serviceLabel,
  propertyLabel,
}: QuoteDetailProps) {
  const router = useRouter();
  const [price, setPrice] = useState(
    quote.priceCents ? (quote.priceCents / 100).toString() : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendQuote() {
    setLoading(true);
    setMessage("");
    try {
      const priceCents = Math.round(parseFloat(price) * 100);
      const response = await fetch(`/api/admin/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Quote sent successfully!");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <BrandLogo href="/admin" contained width={130} height={54} />
          <h1 className="text-lg font-semibold text-navy">Quote Details</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Name:</span>{" "}
                <span className="font-medium">{quote.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>{" "}
                <span className="font-medium">{quote.email}</span>
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>{" "}
                <span className="font-medium">{quote.phone}</span>
              </div>
              <div>
                <span className="text-slate-500">Service:</span>{" "}
                <span className="font-medium">{serviceLabel}</span>
              </div>
              <div>
                <span className="text-slate-500">Property:</span>{" "}
                <span className="font-medium">{propertyLabel}</span>
              </div>
              {quote.preferredDate && (
                <div>
                  <span className="text-slate-500">Preferred Date:</span>{" "}
                  <span className="font-medium">
                    {formatDate(quote.preferredDate)}
                  </span>
                </div>
              )}
              {quote.message && (
                <div>
                  <span className="text-slate-500">Message:</span>
                  <p className="mt-1 rounded-lg bg-slate-50 p-3">
                    {quote.message}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-500">Status:</span>{" "}
                <span className="font-medium capitalize">{quote.status}</span>
              </div>
              <div>
                <span className="text-slate-500">Submitted:</span>{" "}
                <span className="font-medium">
                  {formatDate(quote.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.status === "paid" ? (
                <p className="text-green-600 font-medium">
                  Payment received — booking confirmed.
                </p>
              ) : quote.checkoutUrl && quote.status === "quoted" ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    Quote sent at {formatPrice(quote.priceCents ?? 0)}
                  </p>
                  <a
                    href={quote.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-mint underline"
                  >
                    View payment link
                  </a>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (£)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="150.00"
                    />
                  </div>
                  <Button
                    onClick={sendQuote}
                    disabled={loading || !price}
                    className="w-full"
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Quote to Client
                  </Button>
                </>
              )}
              {message && (
                <p
                  className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-500"}`}
                >
                  {message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

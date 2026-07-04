"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getFromPrice,
  isBigJob,
  SERVICE_LABELS,
  type ServiceType,
} from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { Sparkles, Home, Layers } from "lucide-react";

const services: {
  id: ServiceType;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "carpet",
    icon: <Layers className="h-8 w-8 text-mint" />,
    description:
      "Professional hot-water extraction and stain treatment for all carpet types. Revives fibres and removes deep-set dirt.",
  },
  {
    id: "deep",
    icon: <Sparkles className="h-8 w-8 text-mint" />,
    description:
      "Top-to-bottom deep clean covering kitchens, bathrooms, appliances, and every surface. Perfect for spring cleans.",
  },
  {
    id: "tenancy",
    icon: <Home className="h-8 w-8 text-mint" />,
    description:
      "Move-in and move-out cleaning to landlord standards. Includes oven, fridge, windows, and all rooms.",
  },
];

export function Services() {
  const scrollToBooking = (service: ServiceType) => {
    const booking = document.getElementById("booking");
    booking?.scrollIntoView({ behavior: "smooth" });
    window.dispatchEvent(
      new CustomEvent("select-service", { detail: service })
    );
  };

  return (
    <section id="services" className="relative px-6 py-32">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Our Services
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Professional cleaning tailored to your needs
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group border-white/10 bg-white/5 transition-all hover:border-mint/30 hover:bg-white/10"
            >
              <CardHeader>
                <div className="mb-4">{service.icon}</div>
                <CardTitle className="text-white">
                  {SERVICE_LABELS[service.id]}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-2xl font-bold text-mint">
                  From {formatPrice(getFromPrice(service.id))}
                </p>
                <Button
                  className="w-full"
                  onClick={() => scrollToBooking(service.id)}
                >
                  {service.id === "tenancy" ? "Request quote" : "Book now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export { isBigJob };

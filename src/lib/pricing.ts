export type ServiceType = "carpet" | "deep" | "tenancy";
export type PropertySize =
  | "studio"
  | "1bed"
  | "2bed"
  | "3bed"
  | "4bed"
  | "commercial";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  carpet: "Carpet Cleaning",
  deep: "Deep Cleaning",
  tenancy: "End Of Tenancy Cleaning",
};

export const PROPERTY_SIZE_LABELS: Record<PropertySize, string> = {
  studio: "Studio",
  "1bed": "1 Bedroom",
  "2bed": "2 Bedrooms",
  "3bed": "3 Bedrooms",
  "4bed": "4+ Bedrooms",
  commercial: "Commercial / Office",
};

// Placeholder UK-market prices in pence
export const PRICES: Record<ServiceType, Record<PropertySize, number | null>> = {
  carpet: {
    studio: 4500,
    "1bed": 5500,
    "2bed": 7500,
    "3bed": null,
    "4bed": null,
    commercial: null,
  },
  deep: {
    studio: 8500,
    "1bed": 10500,
    "2bed": 13500,
    "3bed": null,
    "4bed": null,
    commercial: null,
  },
  tenancy: {
    studio: 12000,
    "1bed": 14500,
    "2bed": 17500,
    "3bed": null,
    "4bed": null,
    commercial: null,
  },
};

export function isBigJob(propertySize: PropertySize): boolean {
  return propertySize === "3bed" || propertySize === "4bed" || propertySize === "commercial";
}

export function getPrice(service: ServiceType, propertySize: PropertySize): number | null {
  return PRICES[service][propertySize];
}

export function getFromPrice(service: ServiceType): number {
  const prices = Object.values(PRICES[service]).filter((p): p is number => p !== null);
  return Math.min(...prices);
}

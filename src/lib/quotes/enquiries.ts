import { requireDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import type { EnquiryFormData } from "@/lib/validations";

export const enquiryStore = {
  async create(enquiry: EnquiryFormData): Promise<{ id: string }> {
    const [quote] = await requireDb().insert(quotes).values({
      name: enquiry.name, email: enquiry.email, phone: enquiry.phone,
      serviceType: enquiry.serviceType, propertySize: enquiry.propertySize,
      postcode: enquiry.postcode || null,
      preferredDate: enquiry.preferredDate ? new Date(`${enquiry.preferredDate}T12:00:00Z`) : null,
      message: enquiry.message || null, status: "pending",
    }).returning({ id: quotes.id });
    if (!quote) throw new Error("Enquiry could not be saved");
    return quote;
  },
};

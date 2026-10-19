import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import type { QuoteLineItem } from "@/lib/quotes/pricing";

export const quoteStatusEnum = pgEnum("quote_status", [
  "pending",
  "quoted",
  "paid",
  "cancelled",
]);

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  serviceType: text("service_type").notNull(),
  propertySize: text("property_size").notNull(),
  postcode: text("postcode"),
  preferredDate: timestamp("preferred_date"),
  message: text("message"),
  status: quoteStatusEnum("status").default("pending").notNull(),
  priceCents: integer("price_cents"),
  revolutOrderId: text("revolut_order_id"),
  checkoutUrl: text("checkout_url"),
  lineItems: jsonb("line_items").$type<QuoteLineItem[]>().default([]).notNull(),
  discountCents: integer("discount_cents").default(0).notNull(),
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  version: integer("version").default(0).notNull(),
  quoteEmailSentAt: timestamp("quote_email_sent_at"),
  sendStartedAt: timestamp("send_started_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .references(() => quotes.id)
    .notNull(),
  amountCents: integer("amount_cents").notNull(),
  paidAt: timestamp("paid_at"),
  revolutOrderId: text("revolut_order_id").notNull(),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  customerConfirmationSentAt: timestamp("customer_confirmation_sent_at"),
  adminNotificationSentAt: timestamp("admin_notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role").$type<"ADMIN" | "SUPER_ADMIN">().default("ADMIN").notNull(),
  googleSubject: text("google_subject").unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  rating: integer("rating").notNull(),
  message: text("message").notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;

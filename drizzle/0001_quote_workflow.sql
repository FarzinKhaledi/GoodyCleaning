-- Additive migration: keeps all existing enquiries, admins and bookings.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "postcode" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_cents" integer DEFAULT 0 NOT NULL;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "customer_notes" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "internal_notes" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 0 NOT NULL;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "quote_email_sent_at" timestamp;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "send_started_at" timestamp;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "customer_confirmation_sent_at" timestamp;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "admin_notification_sent_at" timestamp;
UPDATE "bookings" SET "customer_confirmation_sent_at" = "confirmation_sent_at", "admin_notification_sent_at" = "confirmation_sent_at"
WHERE "confirmation_sent_at" IS NOT NULL AND "customer_confirmation_sent_at" IS NULL AND "admin_notification_sent_at" IS NULL;

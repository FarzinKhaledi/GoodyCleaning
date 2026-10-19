-- Existing password admins remain enabled; Google-only admins need no password.
ALTER TABLE "admins" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'ADMIN' NOT NULL;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "google_subject" text;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "admins_google_subject_unique" ON "admins" ("google_subject");

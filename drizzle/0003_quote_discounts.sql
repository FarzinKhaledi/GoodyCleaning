-- Additive: existing quotes retain their fixed discount and recorded payable total.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'fixed' NOT NULL;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_basis_points" integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_discount_metadata_check' AND conrelid = 'quotes'::regclass) THEN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_discount_metadata_check" CHECK (
      ("discount_type" = 'fixed' AND "discount_basis_points" IS NULL) OR
      ("discount_type" = 'percentage' AND "discount_basis_points" IS NOT NULL AND "discount_basis_points" BETWEEN 0 AND 10000)
    );
  END IF;
END $$;

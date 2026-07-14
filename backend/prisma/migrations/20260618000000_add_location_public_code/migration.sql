-- Add stable public code for location QR URLs
ALTER TABLE "locations" ADD COLUMN "public_code" TEXT;

-- Backfill from location names
UPDATE "locations"
SET "public_code" = trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')));

-- Handle empty/invalid slug results
UPDATE "locations"
SET "public_code" = concat('location-', substring("id" from 1 for 8))
WHERE "public_code" IS NULL OR "public_code" = '';

-- Disambiguate duplicates deterministically
WITH ranked_codes AS (
  SELECT
    "id",
    "public_code",
    row_number() OVER (PARTITION BY "public_code" ORDER BY "created_at", "id") AS rn
  FROM "locations"
)
UPDATE "locations" l
SET "public_code" = concat(l."public_code", '-', substring(l."id" from 1 for 8))
FROM ranked_codes r
WHERE l."id" = r."id"
  AND r.rn > 1;

ALTER TABLE "locations" ALTER COLUMN "public_code" SET NOT NULL;
CREATE UNIQUE INDEX "locations_public_code_key" ON "locations"("public_code");

ALTER TABLE "order_items"
ADD COLUMN "prep_date" DATE,
ADD COLUMN "prep_date_snapshot" DATE;

UPDATE "order_items" oi
SET
  "prep_date" = o."order_date",
  "prep_date_snapshot" = o."order_date"
FROM "orders" o
WHERE o."id" = oi."order_id";

ALTER TABLE "order_items"
ALTER COLUMN "prep_date" SET NOT NULL,
ALTER COLUMN "prep_date_snapshot" SET NOT NULL;

CREATE INDEX "order_items_prep_date_idx" ON "order_items"("prep_date");
CREATE INDEX "order_items_prep_date_fulfillment_status_idx" ON "order_items"("prep_date", "fulfillment_status");

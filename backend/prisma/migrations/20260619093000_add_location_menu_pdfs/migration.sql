-- CreateTable
CREATE TABLE "public"."location_menu_pdfs" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_menu_pdfs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_menu_pdfs_location_id_idx" ON "public"."location_menu_pdfs"("location_id");

-- CreateIndex
CREATE INDEX "location_menu_pdfs_created_at_idx" ON "public"."location_menu_pdfs"("created_at");

-- AddForeignKey
ALTER TABLE "public"."location_menu_pdfs" ADD CONSTRAINT "location_menu_pdfs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

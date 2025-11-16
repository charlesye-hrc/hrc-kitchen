-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_menu_item_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_location_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "item_base_price" DECIMAL(10,2),
ADD COLUMN     "item_category" "MenuCategory",
ADD COLUMN     "item_description" TEXT,
ADD COLUMN     "item_image_url" TEXT,
ADD COLUMN     "item_name" TEXT,
ALTER COLUMN "menu_item_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_department" TEXT,
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_full_name" TEXT,
ADD COLUMN     "location_address" TEXT,
ADD COLUMN     "location_name" TEXT,
ADD COLUMN     "location_phone" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

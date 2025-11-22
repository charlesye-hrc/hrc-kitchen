-- CreateEnum
CREATE TYPE "InventoryChangeType" AS ENUM ('RESTOCK', 'ORDER', 'ADJUSTMENT', 'WASTE');

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "track_inventory" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "last_restocked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_history" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "change_type" "InventoryChangeType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_qty" INTEGER NOT NULL,
    "new_qty" INTEGER NOT NULL,
    "user_id" TEXT,
    "order_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventories_location_id_idx" ON "inventories"("location_id");

-- CreateIndex
CREATE INDEX "inventories_menu_item_id_idx" ON "inventories"("menu_item_id");

-- CreateIndex
CREATE INDEX "inventories_stock_quantity_idx" ON "inventories"("stock_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_menu_item_id_location_id_key" ON "inventories"("menu_item_id", "location_id");

-- CreateIndex
CREATE INDEX "inventory_history_inventory_id_idx" ON "inventory_history"("inventory_id");

-- CreateIndex
CREATE INDEX "inventory_history_user_id_idx" ON "inventory_history"("user_id");

-- CreateIndex
CREATE INDEX "inventory_history_order_id_idx" ON "inventory_history"("order_id");

-- CreateIndex
CREATE INDEX "inventory_history_created_at_idx" ON "inventory_history"("created_at");

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

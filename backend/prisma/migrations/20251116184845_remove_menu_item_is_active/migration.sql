-- DropIndex
DROP INDEX IF EXISTS "menu_items_is_active_idx";

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "is_active";

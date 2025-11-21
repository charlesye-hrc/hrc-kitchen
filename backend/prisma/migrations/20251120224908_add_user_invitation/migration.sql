/*
  Warnings:

  - A unique constraint covering the columns `[invitation_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitation_expires_at" TIMESTAMP(3),
ADD COLUMN     "invitation_token" TEXT,
ADD COLUMN     "invited_at" TIMESTAMP(3),
ADD COLUMN     "invited_by" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_invitation_token_key" ON "users"("invitation_token");

-- CreateIndex
CREATE INDEX "users_invited_by_idx" ON "users"("invited_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

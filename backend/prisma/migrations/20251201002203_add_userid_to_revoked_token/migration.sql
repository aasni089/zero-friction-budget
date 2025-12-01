/*
  Warnings:

  - Added the required column `userId` to the `RevokedToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RevokedToken" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RevokedToken_userId_idx" ON "RevokedToken"("userId");

-- AddForeignKey
ALTER TABLE "RevokedToken" ADD CONSTRAINT "RevokedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

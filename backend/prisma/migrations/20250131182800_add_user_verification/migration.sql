/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "status",
ADD COLUMN     "idDocuments" JSONB,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "idType" TEXT,
ADD COLUMN     "idVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idVerifiedAt" TIMESTAMP(3);

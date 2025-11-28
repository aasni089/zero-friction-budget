/*
  Warnings:

  - You are about to drop the column `allowPrivateOffers` on the `Property` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ListingVisibility" AS ENUM ('DRAFT', 'PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "allowPrivateOffers",
ADD COLUMN     "acceptPrivateOffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "listingVisibility" "ListingVisibility" NOT NULL DEFAULT 'DRAFT';

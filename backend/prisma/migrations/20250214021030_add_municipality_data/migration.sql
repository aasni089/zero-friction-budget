/*
  Warnings:

  - You are about to drop the column `municipality` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `ward` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `zoningBylaw` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `zoningBylawUrl` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `zoningCode` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `zoningRawData` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `zoningType` on the `Property` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Property_zoningCode_idx";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "municipality",
DROP COLUMN "ward",
DROP COLUMN "zoningBylaw",
DROP COLUMN "zoningBylawUrl",
DROP COLUMN "zoningCode",
DROP COLUMN "zoningRawData",
DROP COLUMN "zoningType",
ADD COLUMN     "municipalPropertyId" TEXT;

-- CreateTable
CREATE TABLE "MunicipalProperty" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zoningCode" TEXT,
    "zoningType" TEXT,
    "zoningBylaw" TEXT,
    "zoningBylawUrl" TEXT,
    "municipality" TEXT,
    "ward" TEXT,
    "zoningRawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalProperty_address_key" ON "MunicipalProperty"("address");

-- CreateIndex
CREATE INDEX "MunicipalProperty_city_province_idx" ON "MunicipalProperty"("city", "province");

-- CreateIndex
CREATE INDEX "MunicipalProperty_zoningCode_idx" ON "MunicipalProperty"("zoningCode");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_municipalPropertyId_fkey" FOREIGN KEY ("municipalPropertyId") REFERENCES "MunicipalProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

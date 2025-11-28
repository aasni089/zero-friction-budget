/*
  Warnings:

  - You are about to drop the column `additionalInfo` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `permittedAncillaryUses` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `permittedBuildingTypes` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `zoningBylaw` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `zoningBylawUrl` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `zoningCode` on the `MunicipalProperty` table. All the data in the column will be lost.
  - You are about to drop the column `zoningType` on the `MunicipalProperty` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MunicipalProperty_zoningCode_idx";

-- AlterTable
ALTER TABLE "MunicipalProperty" DROP COLUMN "additionalInfo",
DROP COLUMN "permittedAncillaryUses",
DROP COLUMN "permittedBuildingTypes",
DROP COLUMN "zoningBylaw",
DROP COLUMN "zoningBylawUrl",
DROP COLUMN "zoningCode",
DROP COLUMN "zoningType",
ADD COLUMN     "zoneCodeId" TEXT;

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zoningCode" TEXT NOT NULL,
    "primaryZone" TEXT,
    "subzone" TEXT,
    "subzoneHeightLimit" TEXT,
    "subzoneSchedule" TEXT,
    "subzoneException" TEXT,
    "permittedDwellingTypes" TEXT[],
    "prohibitedDwellingTypes" TEXT[],
    "permittedUses" TEXT[],
    "additionalInfo" JSONB,
    "zoningBylawUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zoningCode_key" ON "Zone"("zoningCode");

-- CreateIndex
CREATE INDEX "Zone_city_idx" ON "Zone"("city");

-- CreateIndex
CREATE INDEX "Zone_zoningCode_idx" ON "Zone"("zoningCode");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zoningCode_city_key" ON "Zone"("zoningCode", "city");

-- AddForeignKey
ALTER TABLE "MunicipalProperty" ADD CONSTRAINT "MunicipalProperty_zoneCodeId_fkey" FOREIGN KEY ("zoneCodeId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

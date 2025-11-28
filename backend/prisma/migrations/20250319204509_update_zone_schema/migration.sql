/*
  Warnings:

  - You are about to drop the column `prohibitedDwellingTypes` on the `Zone` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Zone" DROP COLUMN "prohibitedDwellingTypes",
ADD COLUMN     "subzoneFloorSpaceIndex" TEXT,
ADD COLUMN     "subzoneHoldingSymbol" TEXT;

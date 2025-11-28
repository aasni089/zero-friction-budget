/*
  Warnings:

  - The `ancillaryUses` column on the `MunicipalProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `permittedBuildingTypes` column on the `MunicipalProperty` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MunicipalProperty" DROP COLUMN "ancillaryUses",
ADD COLUMN     "ancillaryUses" TEXT[],
DROP COLUMN "permittedBuildingTypes",
ADD COLUMN     "permittedBuildingTypes" TEXT[];

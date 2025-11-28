/*
  Warnings:

  - You are about to drop the column `ancillaryUses` on the `MunicipalProperty` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MunicipalProperty" DROP COLUMN "ancillaryUses",
ADD COLUMN     "permittedAncillaryUses" TEXT[];

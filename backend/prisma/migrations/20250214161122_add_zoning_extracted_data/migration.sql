-- AlterTable
ALTER TABLE "MunicipalProperty" ADD COLUMN     "additionalInfo" JSONB,
ADD COLUMN     "ancillaryUses" JSONB,
ADD COLUMN     "permittedBuildingTypes" JSONB;

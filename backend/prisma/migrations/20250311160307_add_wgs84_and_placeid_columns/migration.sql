-- AlterTable
ALTER TABLE "MunicipalProperty" ADD COLUMN     "latitude_wgs84" DOUBLE PRECISION,
ADD COLUMN     "longitude_wgs84" DOUBLE PRECISION,
ADD COLUMN     "placeId" TEXT;

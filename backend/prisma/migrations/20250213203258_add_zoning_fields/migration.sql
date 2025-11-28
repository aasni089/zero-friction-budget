-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "municipality" TEXT,
ADD COLUMN     "ward" TEXT,
ADD COLUMN     "zoningBylaw" TEXT,
ADD COLUMN     "zoningBylawUrl" TEXT,
ADD COLUMN     "zoningCode" TEXT,
ADD COLUMN     "zoningRawData" JSONB,
ADD COLUMN     "zoningType" TEXT;

-- CreateIndex
CREATE INDEX "Property_zoningCode_idx" ON "Property"("zoningCode");

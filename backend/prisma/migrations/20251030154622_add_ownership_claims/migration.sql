-- CreateEnum
CREATE TYPE "OwnershipClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PropertyOwnershipClaim" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "status" "OwnershipClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "documents" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOwnershipClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyOwnershipClaim_propertyId_idx" ON "PropertyOwnershipClaim"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyOwnershipClaim_claimantId_idx" ON "PropertyOwnershipClaim"("claimantId");

-- CreateIndex
CREATE INDEX "PropertyOwnershipClaim_status_idx" ON "PropertyOwnershipClaim"("status");

-- AddForeignKey
ALTER TABLE "PropertyOwnershipClaim" ADD CONSTRAINT "PropertyOwnershipClaim_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnershipClaim" ADD CONSTRAINT "PropertyOwnershipClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

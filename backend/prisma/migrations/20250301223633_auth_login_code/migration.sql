-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginCode" TEXT,
ADD COLUMN     "loginCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "preferredLoginMethod" TEXT DEFAULT 'email';

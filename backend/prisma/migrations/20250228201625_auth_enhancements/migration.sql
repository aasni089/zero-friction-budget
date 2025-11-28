-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowAccountLinking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferredAuthMethod" TEXT DEFAULT 'magic_link',
ADD COLUMN     "twoFAMethod" TEXT DEFAULT 'email';

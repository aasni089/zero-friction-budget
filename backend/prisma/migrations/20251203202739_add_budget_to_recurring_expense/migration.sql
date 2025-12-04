/*
  Warnings:

  - The values [MAGIC_LINK] on the enum `AuthMethod` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `householdId` to the `RecurringExpense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `RecurringExpense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuthMethod_new" AS ENUM ('OTC', 'GOOGLE');
ALTER TABLE "User" ALTER COLUMN "preferredAuthMethod" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "preferredAuthMethod" TYPE "AuthMethod_new" USING ("preferredAuthMethod"::text::"AuthMethod_new");
ALTER TYPE "AuthMethod" RENAME TO "AuthMethod_old";
ALTER TYPE "AuthMethod_new" RENAME TO "AuthMethod";
DROP TYPE "AuthMethod_old";
ALTER TABLE "User" ALTER COLUMN "preferredAuthMethod" SET DEFAULT 'OTC';
COMMIT;

-- AlterTable
ALTER TABLE "RecurringExpense" ADD COLUMN     "budgetId" TEXT,
ADD COLUMN     "dayOfMonth" INTEGER,
ADD COLUMN     "dayOfWeek" INTEGER,
ADD COLUMN     "householdId" TEXT NOT NULL,
ADD COLUMN     "monthOfYear" INTEGER,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RecurringExpense_householdId_idx" ON "RecurringExpense"("householdId");

-- CreateIndex
CREATE INDEX "RecurringExpense_userId_idx" ON "RecurringExpense"("userId");

-- CreateIndex
CREATE INDEX "RecurringExpense_budgetId_idx" ON "RecurringExpense"("budgetId");

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

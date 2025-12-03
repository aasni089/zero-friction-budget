/*
  Warnings:

  - A unique constraint covering the columns `[primaryBudgetId]` on the table `Household` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "primaryBudgetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Household_primaryBudgetId_key" ON "Household"("primaryBudgetId");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_primaryBudgetId_fkey" FOREIGN KEY ("primaryBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

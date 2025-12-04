-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "budgetId" TEXT;

-- CreateIndex
CREATE INDEX "Category_budgetId_idx" ON "Category"("budgetId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Associate existing categories with budgets
-- Strategy: Duplicate each category for ALL budgets in the household
-- This preserves existing functionality and ensures all budgets have the same categories

-- Step 1: For each existing category, create copies for each budget in the same household
INSERT INTO "Category" ("id", "householdId", "budgetId", "name", "icon", "color", "parentId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(), -- New unique ID for the duplicated category
    c."householdId",
    b."id" AS "budgetId",
    c."name",
    c."icon",
    c."color",
    c."parentId",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "Category" c
CROSS JOIN "Budget" b
WHERE c."householdId" = b."householdId"
  AND c."budgetId" IS NULL; -- Only process categories that don't have a budget yet

-- Step 2: Delete the original categories (now that we have budget-specific copies)
DELETE FROM "Category" WHERE "budgetId" IS NULL;

-- Revert to Household-Level Categories
-- This migration converts all budget-specific categories back to household-level
-- and removes duplicates to maintain data integrity

-- Step 1: Create a temporary table with deduplicated categories
-- Keep the most recently created instance of each category per household
CREATE TEMPORARY TABLE temp_keep_categories AS
SELECT DISTINCT ON (c."householdId", c."name") c."id"
FROM "Category" c
ORDER BY c."householdId", c."name", c."createdAt" DESC;

-- Step 2: Delete duplicate categories (keep only the IDs in temp table)
DELETE FROM "Category"
WHERE "id" NOT IN (SELECT "id" FROM temp_keep_categories);

-- Step 3: Set budgetId to NULL for all remaining categories (make household-level)
UPDATE "Category" SET "budgetId" = NULL;

-- Drop temp table
DROP TABLE temp_keep_categories;
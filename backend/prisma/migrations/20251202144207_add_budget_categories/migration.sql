-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "allocatedAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetCategory_budgetId_idx" ON "BudgetCategory"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetCategory_categoryId_idx" ON "BudgetCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_budgetId_categoryId_key" ON "BudgetCategory"("budgetId", "categoryId");

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

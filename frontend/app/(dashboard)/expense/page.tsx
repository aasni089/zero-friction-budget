'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { getBudgets, getPrimaryBudget, type Budget } from '@/lib/api/budget-client';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ExpenseInput } from '@/components/expense/ExpenseInput';
import { LineItemProgressBar } from '@/components/budget/LineItemProgressBar';

export default function ExpensePage() {
  const { currentHouseholdId, households, budgets, budgetsLoading, setBudgets, setBudgetsLoading, triggerRefresh } = useUiStore();
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [primaryBudget, setPrimaryBudget] = useState<any>(null);
  const [loadingPrimaryBudget, setLoadingPrimaryBudget] = useState(true);

  // Function to refetch primary budget
  const refetchPrimaryBudget = async () => {
    if (!currentHouseholdId) return;
    try {
      const budget = await getPrimaryBudget(currentHouseholdId);
      setPrimaryBudget(budget);
      triggerRefresh(); // Trigger global refresh
    } catch (error) {
      console.error('Failed to refetch primary budget:', error);
    }
  };

  // Coordinated data fetching
  useEffect(() => {
    const fetchData = async () => {
      // Wait for household context to be ready
      if (households.length === 0 && currentHouseholdId === null) {
        // Still loading households or no households exist
        if (households.length === 0) {
          // If we're sure there are no households (e.g. after auth load), stop loading
          // But here we rely on the store's state. 
          // Let's assume if we have no households and no ID, we are waiting.
          return;
        }
      }

      if (!currentHouseholdId) {
        setIsInitialLoad(false);
        setBudgetsLoading(false);
        setLoadingPrimaryBudget(false);
        return;
      }

      try {
        setIsInitialLoad(true);
        setBudgetsLoading(true);
        setLoadingPrimaryBudget(true);
        setError(null);

        const [budgetsData, primaryBudgetData] = await Promise.all([
          getBudgets(currentHouseholdId),
          getPrimaryBudget(currentHouseholdId).catch(() => null) // Allow primary budget to fail (e.g. 404)
        ]);

        setBudgets(budgetsData || []);
        setPrimaryBudget(primaryBudgetData);
      } catch (error: any) {
        console.error('Failed to fetch data:', error);
        setError(error?.message || 'Failed to load data. Please try again.');
      } finally {
        setBudgetsLoading(false);
        setLoadingPrimaryBudget(false);
        setIsInitialLoad(false);
      }
    };

    fetchData();
  }, [currentHouseholdId, setBudgets, setBudgetsLoading]);

  // Loading state - show full page skeleton
  if (isInitialLoad || (budgetsLoading && budgets.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl space-y-8">
          {/* Greeting skeleton */}
          <div className="text-center space-y-2">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          {/* Input skeleton */}
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          {/* Progress skeleton */}
          <Skeleton className="h-[200px] w-full rounded-2xl" />
          {/* Recent activity skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Budgets</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Check 1: No households exist
  if (households.length === 0) {
    return <EmptyState type="household" />;
  }

  // Check 2: No household selected
  if (!currentHouseholdId) {
    return <EmptyState type="household" />;
  }

  // Check 3: No budgets exist for the household
  if (budgets.length === 0) {
    return <EmptyState type="budget" />;
  }

  // All checks passed: show expense input
  return (
    <div className="min-h-screen flex flex-col items-center pt-8 px-4 animate-in fade-in duration-500">
      <div className="w-full max-w-xl space-y-6">
        <ExpenseInput
          primaryBudgetId={primaryBudget?.id}
          onExpenseCreated={refetchPrimaryBudget}
        >
          {/* Primary Budget Progress */}
          {primaryBudget && primaryBudget.lineItems && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                {primaryBudget.name} Progress
              </h3>
              <div className="space-y-4">
                {primaryBudget.lineItems.map((lineItem: any) => (
                  <LineItemProgressBar
                    key={lineItem.id}
                    categoryName={lineItem.category.name}
                    categoryIcon={lineItem.category.icon}
                    allocated={lineItem.allocatedAmount}
                    spent={lineItem.spent}
                    color={lineItem.category.color}
                  />
                ))}
              </div>
            </div>
          )}
        </ExpenseInput>
      </div>
    </div>
  );
}

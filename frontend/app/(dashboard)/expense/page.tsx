'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { getBudgets, type Budget } from '@/lib/api/budget-client';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ExpenseInput } from '@/components/expense/ExpenseInput';

export default function ExpensePage() {
  const { currentHouseholdId, households, budgets, budgetsLoading, setBudgets, setBudgetsLoading } = useUiStore();
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Wait for households to be loaded first
  useEffect(() => {
    // If we have households OR we have neither households nor a selected ID
    // (meaning layout has finished loading), we're past initial load
    if (households.length > 0 || (households.length === 0 && currentHouseholdId === null)) {
      setIsInitialLoad(false);
    }
  }, [households, currentHouseholdId]);

  useEffect(() => {
    const fetchBudgets = async () => {
      // Wait until we're past initial load
      if (isInitialLoad) {
        return;
      }

      // If no household selected, don't try to fetch budgets
      if (!currentHouseholdId) {
        setBudgetsLoading(false);
        setBudgets([]); // Clear budgets when no household
        return;
      }

      try {
        setBudgetsLoading(true);
        setError(null);
        const response = await getBudgets(currentHouseholdId);
        setBudgets(response || []);
      } catch (error: any) {
        console.error('Failed to fetch budgets:', error);
        setError(
          error?.message || 'Failed to load budgets. Please try again.'
        );
      } finally {
        setBudgetsLoading(false);
      }
    };

    fetchBudgets();
  }, [currentHouseholdId, isInitialLoad, setBudgets, setBudgetsLoading]);

  // Loading state - only show skeleton during initial load
  // After that, rely on component-level loading states
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
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

  // Check 2: No household selected (shouldn't happen, but handle it)
  if (!currentHouseholdId) {
    return <EmptyState type="household" />;
  }

  // Check 3: No budgets exist for the household
  if (budgets.length === 0) {
    return <EmptyState type="budget" />;
  }

  // All checks passed: show expense input
  return (
    <div className="min-h-screen">
      <ExpenseInput />
    </div>
  );
}

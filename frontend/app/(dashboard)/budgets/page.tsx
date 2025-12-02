'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUiStore } from '@/lib/stores/ui';
import { getBudgets, type Budget } from '@/lib/api/budget-client';
import { useRealtime } from '@/hooks/useRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ArrowLeft } from 'lucide-react';
import { CreateBudgetDialog } from '@/components/budget/CreateBudgetDialog';
import { BudgetCard } from '@/components/budget/BudgetCard';

export default function BudgetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentHouseholdId, budgets, budgetsLoading, setBudgets, setBudgetsLoading } = useUiStore();

  const [error, setError] = useState<string | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);

  // Check if we should auto-open create modal (from ?action=create)
  const shouldAutoCreate = searchParams.get('action') === 'create';

  useEffect(() => {
    const fetchBudgets = async () => {
      if (!currentHouseholdId) {
        setBudgetsLoading(false);
        return;
      }

      // Only fetch if we don't have budgets in store yet
      // This prevents duplicate fetches when navigating from expense page
      if (budgets.length > 0) {
        setBudgetsLoading(false);
        return;
      }

      try {
        setBudgetsLoading(true);
        setError(null);
        const response = await getBudgets(currentHouseholdId);
        setBudgets(response || []);
      } catch (error: any) {
        console.error('Failed to fetch budgets:', error);
        setError(error?.message || 'Failed to load budgets');
      } finally {
        setBudgetsLoading(false);
      }
    };

    fetchBudgets();
  }, [currentHouseholdId, budgets.length, setBudgets, setBudgetsLoading]);

  // Subscribe to real-time budget updates
  useRealtime({
    onBudgetUpdated: (budget, action) => {
      if (action === 'created') {
        setBudgets([...budgets, budget]);
      } else if (action === 'updated') {
        setBudgets(budgets.map(b => b.id === budget.id ? budget : b));
      } else if (action === 'deleted') {
        setBudgets(budgets.filter(b => b.id !== budget.id));
      }
    },
    // Refetch budgets when an expense is created to update progress
    onExpenseCreated: async () => {
      if (currentHouseholdId) {
        try {
          const response = await getBudgets(currentHouseholdId);
          setBudgets(response || []);
        } catch (error) {
          console.error('Failed to refresh budgets:', error);
        }
      }
    },
  });

  // Refresh budgets when page becomes visible (e.g., navigating from expense page)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && currentHouseholdId && budgets.length > 0) {
        try {
          const response = await getBudgets(currentHouseholdId);
          setBudgets(response || []);
        } catch (error) {
          console.error('Failed to refresh budgets on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentHouseholdId, budgets.length, setBudgets]);

  // Auto-open create modal if requested
  useEffect(() => {
    if (shouldAutoCreate && !budgetsLoading) {
      setIsCreateBudgetOpen(true);
      // Optional: Clear the query param so it doesn't reopen on refresh?
      // For now, keeping it simple.
    }
  }, [shouldAutoCreate, budgetsLoading]);

  if (budgetsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Budgets</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/expense')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
          </div>
          <Button
            onClick={() => setIsCreateBudgetOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Budget
          </Button>
        </div>



        {/* Budgets List */}
        {budgets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600 mb-4">No budgets found</p>
            <p className="text-sm text-gray-500">
              Create your first budget to start tracking expenses
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}
      </div>

      <CreateBudgetDialog
        open={isCreateBudgetOpen}
        onOpenChange={setIsCreateBudgetOpen}
        onSuccess={() => {
          // If we came from empty state with ?action=create, 
          // we might want to clean up the URL, but it's not strictly necessary.
        }}
      />
    </div>
  );
}

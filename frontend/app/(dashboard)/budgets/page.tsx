'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUiStore } from '@/lib/stores/ui';
import { getBudgets, type Budget, setPrimaryBudget } from '@/lib/api/budget-client';
import { useRealtime } from '@/hooks/useRealtime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ArrowLeft } from 'lucide-react';
import { CreateBudgetDialog } from '@/components/budget/CreateBudgetDialog';
import { BudgetCard } from '@/components/budget/BudgetCard';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function BudgetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentHouseholdId, triggerRefresh } = useUiStore();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [isUpdatingPrimary, setIsUpdatingPrimary] = useState(false);

  // Check if we should auto-open create modal (from ?action=create)
  const shouldAutoCreate = searchParams.get('action') === 'create';

  // Filter budgets based on selected period
  const filteredBudgets = periodFilter === 'ALL'
    ? budgets
    : budgets.filter(b => b.period === periodFilter);

  // Sort budgets: primary first, then by startDate desc
  const sortedBudgets = [...filteredBudgets].sort((a, b) => {
    // Primary budget always first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    // Then by start date (most recent first)
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  useEffect(() => {
    const fetchBudgets = async () => {
      if (!currentHouseholdId) {
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
  }, [currentHouseholdId, setBudgets, setBudgetsLoading]);

  // Subscribe to real-time budget updates
  useRealtime({
    onBudgetUpdated: (budget, action) => {
      console.log('[BudgetsPage] Received budget update:', { budgetId: budget.id, action });
      if (action === 'deleted') {
        // Optimistic update: immediately remove from UI
        console.log('[BudgetsPage] Removing budget from UI:', budget.id);
        setBudgets(prevBudgets => {
          const filtered = prevBudgets.filter(b => b.id !== budget.id);
          console.log('[BudgetsPage] Budgets after filter:', filtered.length, 'remaining');
          return filtered;
        });
      } else {
        // Refetch all budgets to ensure isPrimary flags are correct
        console.log('[BudgetsPage] Refetching budgets after', action);
        if (currentHouseholdId) {
          getBudgets(currentHouseholdId).then(response => {
            setBudgets(response || []);
          });
        }
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

  // Handle toggling primary budget
  const handleTogglePrimary = async (budgetId: string, isPrimary: boolean) => {
    if (isUpdatingPrimary) return; // Prevent multiple simultaneous updates

    try {
      setIsUpdatingPrimary(true);

      // Call API first and wait for response
      await setPrimaryBudget(budgetId, isPrimary);

      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 300));

      // Only update UI after backend confirms success
      if (currentHouseholdId) {
        const response = await getBudgets(currentHouseholdId);

        // Update local state - React will properly re-render
        setBudgets(response || []);
        triggerRefresh(); // Trigger global refresh
      }

      toast.success(isPrimary ? 'Budget set as primary' : 'Primary budget removed');
    } catch (error: any) {
      console.error('Failed to toggle primary budget:', error);
      toast.error(error?.message || 'Failed to update primary budget');
    } finally {
      setIsUpdatingPrimary(false);
    }
  };

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
      <div className="min-h-screen bg-background px-6 pt-12 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-[150px]" />
              <Skeleton className="h-10 w-[140px]" />
            </div>
          </div>
          {/* Budget cards skeleton */}
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Budgets</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-12 pb-8">
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Budgets</h1>
              <p className="text-muted-foreground mt-1">
                Manage your spending limits and goals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Periods</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsCreateBudgetOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Budget
            </Button>
          </div>
        </div>



        {/* Budgets List */}
        {budgets.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">No budgets found</p>
            <p className="text-sm text-muted-foreground/80">
              Create your first budget to start tracking expenses
            </p>
          </Card>
        ) : filteredBudgets.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">No budgets found for selected period</p>
            <p className="text-sm text-muted-foreground/80">
              Try selecting a different period or create a new budget
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sortedBudgets.map((budget) => (
                <motion.div
                  key={budget.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 350, damping: 30 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.3 }
                  }}
                >
                  <BudgetCard
                    budget={budget}
                    onTogglePrimary={handleTogglePrimary}
                    onDelete={(budgetId) => {
                      setBudgets(prev => prev.filter(b => b.id !== budgetId));
                    }}
                    isUpdating={isUpdatingPrimary}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateBudgetDialog
        open={isCreateBudgetOpen}
        onOpenChange={setIsCreateBudgetOpen}
        onSuccess={async () => {
          // Refetch budgets to get updated isPrimary flags
          if (currentHouseholdId) {
            const response = await getBudgets(currentHouseholdId);
            setBudgets(response || []);
            triggerRefresh(); // Trigger global refresh
          }
        }}
      />
    </div>
  );
}

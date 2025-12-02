'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUiStore } from '@/lib/stores/ui';
import { getBudgets, type Budget } from '@/lib/api/budget-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ArrowLeft } from 'lucide-react';

export default function BudgetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentHouseholdId, budgets, budgetsLoading, setBudgets, setBudgetsLoading } = useUiStore();

  const [error, setError] = useState<string | null>(null);

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

  // Show auto-create hint if requested
  useEffect(() => {
    if (shouldAutoCreate && !budgetsLoading) {
      // This will be replaced with modal open in Task 3.5
      console.log('Auto-open create budget modal (to be implemented in Task 3.5)');
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
            onClick={() => {
              // This will open create modal in Task 3.5
              console.log('Open create budget modal (to be implemented in Task 3.5)');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Budget
          </Button>
        </div>

        {/* Auto-create hint */}
        {shouldAutoCreate && budgets.length === 0 && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <p className="text-blue-900">
              <strong>Note:</strong> Budget creation modal will be implemented in Task 3.5.
              Click "Create Budget" button above to prepare for the modal.
            </p>
          </Card>
        )}

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
              <Card key={budget.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {budget.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {budget.period} • ${budget.amount.toFixed(2)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useUiStore } from '@/lib/stores/ui';
import { getMonthlySummary, type MonthlySummaryResponse } from '@/lib/api/dashboard-client';
import { getExpenses, type Expense } from '@/lib/api/expense-client';
import { getBudgets, type Budget } from '@/lib/api/budget-client';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load heavy chart components
const SpendingByCategory = dynamic(
  () => import('@/components/dashboard/SpendingByCategory').then(mod => mod.SpendingByCategory),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false
  }
);

const DailySpendingTrend = dynamic(
  () => import('@/components/dashboard/DailySpendingTrend').then(mod => mod.DailySpendingTrend),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false
  }
);

export default function TrackPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentHouseholdId, households, refreshKey, budgets, setBudgets } = useUiStore();

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>(undefined);
  // const [budgets, setBudgets] = useState<Budget[]>([]); // Removed local state
  const [dashboardData, setDashboardData] = useState<MonthlySummaryResponse | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Wait for households to be loaded first
  useEffect(() => {
    // If we have households OR we have neither households nor a selected ID
    // (meaning layout has finished loading), we're past initial load
    if (households.length > 0 || (households.length === 0 && currentHouseholdId === null)) {
      setIsInitialLoad(false);
    }
  }, [households, currentHouseholdId]);

  // Fetch budgets when household changes
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!currentHouseholdId || isInitialLoad) {
        return;
      }

      // If we already have budgets in store, use them
      if (budgets.length > 0) {
        // Auto-select primary budget or first budget if not already selected
        if (!selectedBudgetId) {
          const primaryBudget = budgets.find((b: any) => b.isPrimary);
          if (primaryBudget) {
            setSelectedBudgetId(primaryBudget.id);
          } else if (budgets.length > 0) {
            setSelectedBudgetId(budgets[0].id);
          }
        }
        return;
      }

      try {
        const budgetList = await getBudgets(currentHouseholdId);
        setBudgets(budgetList);

        // Auto-select primary budget or first budget
        const primaryBudget = budgetList.find(b => b.isPrimary);
        if (primaryBudget) {
          setSelectedBudgetId(primaryBudget.id);
        } else if (budgetList.length > 0) {
          setSelectedBudgetId(budgetList[0].id);
        }
      } catch (error) {
        console.error('Error fetching budgets:', error);
        toast.error('Failed to load budgets');
      }
    };

    fetchBudgets();
  }, [currentHouseholdId, isInitialLoad, refreshKey, budgets, setBudgets, selectedBudgetId]);

  // Fetch dashboard data when household, month, or budget changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Wait until we're past initial load
      if (isInitialLoad) {
        return;
      }

      // If no household selected, don't try to fetch data
      if (!currentHouseholdId) {
        setLoading(false);
        setDashboardData(null);
        return;
      }

      try {
        setLoading(true);

        // Fetch monthly summary (with optional budget ID)
        const summary = await getMonthlySummary(currentHouseholdId, selectedMonth, selectedBudgetId);
        setDashboardData(summary);

        // Fetch recent expenses (last 10)
        const expensesResponse = await getExpenses({
          householdId: currentHouseholdId,
          limit: 10,
        });
        setRecentExpenses(expensesResponse.expenses);
      } catch (error) {
        console.error('Error fetching track data:', error);
        toast.error('Failed to load spending data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentHouseholdId, selectedMonth, selectedBudgetId, isInitialLoad, refreshKey]);

  // Show empty state if no household (and we're done with initial load)
  if (!isInitialLoad && !loading && !currentHouseholdId) {
    return <EmptyState type="household" />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500">Loading spending data...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-gray-500">No spending data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/expense')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Track Spending</h1>
            <p className="text-muted-foreground mt-1">
              {dashboardData?.selectedBudget
                ? `Tracking: ${dashboardData.selectedBudget.name}`
                : 'Overview of your household spending and trends'}
            </p>
          </div>
        </div>
      </div>

      {/* Month and Budget Selectors */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

        {/* Budget Selector */}
        {budgets.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Budget:</label>
            <Select
              value={selectedBudgetId}
              onValueChange={(value) => setSelectedBudgetId(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards data={dashboardData} />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <SpendingByCategory categories={dashboardData.categoryBreakdown.top5} />

        {/* Daily Spending Trend */}
        <DailySpendingTrend
          dailyData={dashboardData.trends.dailyBreakdown}
          projectedSpending={dashboardData.trends.projectedSpending}
        />
      </div>

      {/* Recent Expenses */}
      <RecentExpenses expenses={recentExpenses} />
    </div>
  );
}

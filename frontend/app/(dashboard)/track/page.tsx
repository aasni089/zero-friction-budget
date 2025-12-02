'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { useUiStore } from '@/lib/stores/ui';
import { getMonthlySummary, type MonthlySummaryResponse } from '@/lib/api/dashboard-client';
import { getExpenses, type Expense } from '@/lib/api/expense-client';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { SpendingByCategory } from '@/components/dashboard/SpendingByCategory';
import { DailySpendingTrend } from '@/components/dashboard/DailySpendingTrend';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { toast } from 'sonner';

export default function TrackPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentHouseholdId, households } = useUiStore();

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
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

  // Fetch dashboard data when household or month changes
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

        // Fetch monthly summary
        const summary = await getMonthlySummary(currentHouseholdId, selectedMonth);
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
  }, [currentHouseholdId, selectedMonth, isInitialLoad]);

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

  // Calculate total transaction count for the summary cards
  const transactionCount = dashboardData.categoryBreakdown.all.reduce(
    (sum, cat) => sum + cat.count,
    0
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Track Spending</h1>
          <p className="text-gray-500 mt-1">
            Overview of your household spending and trends
          </p>
        </div>
      </div>

      {/* Month Selector */}
      <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      {/* Summary Cards */}
      <SummaryCards data={dashboardData} transactionCount={transactionCount} />

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

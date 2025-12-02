'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { useAuthStore } from '@/lib/stores/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBudgets } from '@/lib/api/budget-client';
import { getExpenses } from '@/lib/api/expense-client';
import { ArrowRight, Plus, TrendingUp, Wallet, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { SpendingTrendChart } from '@/components/dashboard/SpendingTrendChart';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { currentHouseholdId } = useUiStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const [stats, setStats] = useState({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    percentage: 0,
    activeBudgets: 0
  });
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentHouseholdId) return;

      try {
        setIsLoading(true);

        const startDate = startOfMonth(currentDate);
        const endDate = endOfMonth(currentDate);

        // Fetch budgets and expenses in parallel
        // Note: For a real production app, we'd want a dedicated dashboard endpoint
        // to avoid over-fetching, but for now we'll aggregate on the client.
        const [fetchedBudgets, fetchedExpenses] = await Promise.all([
          getBudgets(currentHouseholdId),
          getExpenses(currentHouseholdId, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 1000 // Fetch enough for charts
          })
        ]);

        // Calculate total spent for the month
        const totalSpent = fetchedExpenses.reduce((sum, e) => {
          if (e.type === 'EXPENSE') return sum + e.amount;
          return sum;
        }, 0);

        // Calculate total budget (monthly budgets only for simplicity in this view)
        // We could normalize weekly/yearly, but let's stick to monthly for now
        const totalBudget = fetchedBudgets
          .filter(b => b.period === 'MONTHLY')
          .reduce((acc, b) => acc + b.amount, 0);

        // Enrich budgets with spent amount for the chart
        // We need to match expenses to budget categories
        const enrichedBudgets = fetchedBudgets.map(budget => {
          // Find expenses that match any category in this budget
          const budgetCategoryIds = budget.categories?.map((bc: any) => bc.categoryId) || [];

          const spent = fetchedExpenses
            .filter(e => e.type === 'EXPENSE' && e.categoryId && budgetCategoryIds.includes(e.categoryId))
            .reduce((sum, e) => sum + e.amount, 0);

          return {
            ...budget,
            spent
          };
        });

        setStats({
          totalBudget,
          totalSpent,
          remaining: totalBudget - totalSpent,
          percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
          activeBudgets: fetchedBudgets.length
        });

        setMonthlyExpenses(fetchedExpenses);
        setRecentExpenses(fetchedExpenses.slice(0, 5)); // Just take top 5 from the monthly list
        setBudgets(enrichedBudgets);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentHouseholdId, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.name?.split(' ')[0]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-card border border-border/50 rounded-lg p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 text-sm font-medium min-w-[120px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
                disabled={isSameMonth(currentDate, new Date()) && currentDate > new Date()} // Optional: prevent future navigation if desired
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Link href="/expense">
              <Button className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-border/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <h3 className="text-2xl font-bold text-foreground">
                  ${stats.totalBudget.toLocaleString()}
                </h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-xl">
                <TrendingUp className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <h3 className="text-2xl font-bold text-foreground">
                  ${stats.totalSpent.toLocaleString()}
                </h3>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:shadow-md transition-shadow flex flex-col justify-center items-start cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = '/budgets'}>
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Budgets</p>
                <h3 className="text-2xl font-bold text-foreground">{stats.activeBudgets}</h3>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Spending Trend - Spans 2 cols on large screens */}
          <div className="lg:col-span-2">
            <SpendingTrendChart expenses={monthlyExpenses} currentDate={currentDate} />
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-1">
            <CategoryBreakdownChart expenses={monthlyExpenses} />
          </div>
        </div>

        {/* Budget vs Actual & Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <BudgetVsActualChart budgets={budgets} />

          {/* Recent Activity Section */}
          <Card className="p-6 border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Latest transactions</p>
              </div>
              <Link href="/expense" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="text-center py-8 border-dashed border rounded-lg">
                <p className="text-muted-foreground mb-4">No recent activity</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/expense'}>
                  Record expense
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ring-1 ring-border/50"
                        style={{
                          backgroundColor: expense.category?.color ? `${expense.category.color}20` : 'var(--muted)',
                          color: expense.category?.color || 'var(--foreground)'
                        }}
                      >
                        {expense.category?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {expense.description || expense.category?.name || 'Expense'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{expense.category?.name || 'Uncategorized'}</span>
                          <span>•</span>
                          <span>{format(new Date(expense.date), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      ${expense.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

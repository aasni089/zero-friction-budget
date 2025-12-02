'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, Receipt } from 'lucide-react';
import type { MonthlySummaryResponse } from '@/lib/api/dashboard-client';

interface SummaryCardsProps {
  data: MonthlySummaryResponse;
  transactionCount: number;
}

export function SummaryCards({ data, transactionCount }: SummaryCardsProps) {
  const { summary, categoryBreakdown } = data;

  // Get top spending category
  const topCategory = categoryBreakdown.top5[0];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {summary.budgetUsagePercentage.toFixed(1)}% of budget used
          </p>
        </CardContent>
      </Card>

      {/* Budget Remaining */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
          <DollarSign
            className={`h-4 w-4 ${
              summary.budgetRemaining >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(summary.budgetRemaining)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            of {formatCurrency(summary.totalBudgetAmount)} total budget
          </p>
        </CardContent>
      </Card>

      {/* Top Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {topCategory ? (
            <>
              <div className="text-2xl font-bold">{topCategory.name}</div>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(topCategory.total)} ({topCategory.percentage.toFixed(1)}%)
              </p>
            </>
          ) : (
            <div className="text-sm text-gray-500">No expenses yet</div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <Receipt className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{transactionCount}</div>
          <p className="text-xs text-gray-500 mt-1">
            {data.period.daysElapsed} of {data.period.totalDays} days elapsed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

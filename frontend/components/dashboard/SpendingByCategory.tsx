'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { CategorySpending } from '@/lib/api/dashboard-client';

interface SpendingByCategoryProps {
  categories: CategorySpending[];
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function SpendingByCategory({ categories }: SpendingByCategoryProps) {
  const router = useRouter();

  // Calculate "Other" category if there are more than 5 categories
  const top5 = categories.slice(0, 5);
  const remaining = categories.slice(5);

  const otherTotal = remaining.reduce((sum, cat) => sum + cat.total, 0);
  const otherPercentage = remaining.reduce((sum, cat) => sum + cat.percentage, 0);

  // Format data for the pie chart
  const chartData: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
    categoryId?: string;
  }> = top5.map((category, index) => ({
    name: category.name,
    value: category.total,
    percentage: category.percentage,
    color: COLORS[index % COLORS.length],
    categoryId: category.id,
  }));

  // Add "Other" category if there are remaining categories
  if (remaining.length > 0 && otherTotal > 0) {
    chartData.push({
      name: 'Other',
      value: otherTotal,
      percentage: otherPercentage,
      color: '#9ca3af', // gray-400
      categoryId: undefined, // Other is aggregated, no single category ID
    });
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <p className="text-sm text-gray-500">
          {remaining.length > 0 ? `Top 5 categories + ${remaining.length} other${remaining.length > 1 ? 's' : ''}` : 'Top categories by spending'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name} (${entry.percentage.toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={(data: any) => {
                if (data.categoryId) {
                  router.push(`/categories/${data.categoryId}`);
                }
              }}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Category List */}
        <div className="mt-4 space-y-2">
          {chartData.map((category, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm cursor-pointer hover:bg-secondary/50 p-2 rounded-md transition-colors"
              onClick={() => {
                if (category.categoryId) {
                  router.push(`/categories/${category.categoryId}`);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
              <span className="font-semibold">{formatCurrency(category.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

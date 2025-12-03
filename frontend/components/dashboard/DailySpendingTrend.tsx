'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailySpending } from '@/lib/api/dashboard-client';

interface DailySpendingTrendProps {
  dailyData: DailySpending[];
  projectedSpending: number;
}

export function DailySpendingTrend({ dailyData, projectedSpending }: DailySpendingTrendProps) {
  // Format data for the line chart
  const chartData = dailyData.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    amount: day.total,
    fullDate: day.date,
  }));

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
          <p className="font-semibold text-sm">
            {new Date(data.fullDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-600">{formatCurrency(data.amount)}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate max value for Y-axis
  const maxValue = Math.max(...chartData.map((d) => d.amount));
  const yAxisMax = Math.ceil(maxValue * 1.2);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending Trend</CardTitle>
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
        <CardTitle>Daily Spending Trend</CardTitle>
        <p className="text-sm text-gray-500">
          Projected end-of-month: {formatCurrency(projectedSpending)}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
              domain={[0, yAxisMax]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

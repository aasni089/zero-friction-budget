'use client';

import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

import { Expense } from '@/lib/api/expense-client';

interface SpendingTrendChartProps {
    expenses: Expense[];
    currentDate: Date;
}

interface ChartDataPoint {
    date: string;
    amount: number;
    cumulative: number;
    fullDate: Date;
}

export function SpendingTrendChart({ expenses, currentDate }: SpendingTrendChartProps) {
    const data = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        return days.reduce((acc, day) => {
            const dayExpenses = expenses.filter((e) =>
                isSameDay(new Date(e.date), day) && e.type === 'EXPENSE'
            );
            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
            const previousCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;

            acc.push({
                date: format(day, 'MMM d'),
                amount: dayTotal,
                cumulative: previousCumulative + dayTotal,
                fullDate: day,
            });
            return acc;
        }, [] as ChartDataPoint[]);
    }, [expenses, currentDate]);

    // Filter out future dates if current month is selected to avoid flat line at end
    const filteredData = useMemo(() => {
        const today = new Date();
        if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            return data.filter(d => d.fullDate <= today);
        }
        return data;
    }, [data, currentDate]);

    return (
        <Card className="p-6 border-border/50 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Spending Trend</h3>
                <p className="text-sm text-muted-foreground">Cumulative spending over time</p>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                        />
                        <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCumulative)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

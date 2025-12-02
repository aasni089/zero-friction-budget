'use client';

import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell
} from 'recharts';
import { Card } from '@/components/ui/card';

import { Budget } from '@/lib/api/budget-client';

interface BudgetVsActualChartProps {
    budgets: (Budget & { spent: number })[];
}

export function BudgetVsActualChart({ budgets }: BudgetVsActualChartProps) {
    const data = useMemo(() => {
        return budgets.map((budget) => {
            // Calculate spent from budget categories if available, or use a passed in 'spent' prop if we had it.
            // The budget object from API usually has 'categories' with 'allocatedAmount'.
            // But the actual 'spent' calculation is typically done on the frontend or via a separate field.
            // In BudgetsPage, we use `useBudgetProgress` hook or similar logic.
            // However, the `getBudgets` API response includes `categories` but maybe not the aggregated spent directly on the budget object unless we computed it.
            // Wait, `getBudgets` controller doesn't seem to aggregate spent.
            // But `BudgetCard` uses `useBudgetProgress` which calculates it from expenses? 
            // No, `BudgetCard` receives `budget` and calculates progress.
            // Actually, let's look at `BudgetCard` again. It calls `useBudgetProgress(budget.id)`.
            // That hook fetches expenses.
            // This is inefficient for a list of budgets in a chart.
            // Ideally, we should pass fully calculated data to this chart.
            // For now, let's assume the parent component calculates the 'spent' and passes it, OR we just visualize the budget limits vs allocated.
            // Actually, the requirement is "Budget vs Actual".
            // We need the 'actual' spent.
            // The parent `DashboardPage` fetches expenses. We can aggregate them there and pass enriched budget objects.

            // Let's assume the `budget` object passed here has a `spent` property added to it by the parent.
            return {
                name: budget.name,
                budget: budget.amount,
                spent: budget.spent || 0, // Expecting parent to inject this
                color: budget.categories?.[0]?.category?.color || 'var(--primary)', // Use first category color or primary
            };
        }).sort((a, b) => b.budget - a.budget);
    }, [budgets]);

    if (data.length === 0) {
        return (
            <Card className="p-6 border-border/50 shadow-sm h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Budget vs Actual</h3>
                <p className="text-muted-foreground">No active budgets found.</p>
            </Card>
        )
    }

    return (
        <Card className="p-6 border-border/50 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Budget Adherence</h3>
                <p className="text-sm text-muted-foreground">Planned vs. Actual Spending</p>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={100}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                            itemStyle={{ color: 'var(--foreground)' }}
                            formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'spent' ? 'Spent' : 'Budget']}
                        />
                        <Bar dataKey="budget" fill="var(--muted)" radius={[0, 4, 4, 0]} barSize={20} stackId="a" />
                        <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={20} stackId="b">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.spent > entry.budget ? 'var(--destructive)' : entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

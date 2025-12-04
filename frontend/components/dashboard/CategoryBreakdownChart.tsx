'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

import { Expense } from '@/lib/api/expense-client';

interface CategoryBreakdownChartProps {
    expenses: Expense[];
}

export function CategoryBreakdownChart({ expenses }: CategoryBreakdownChartProps) {
    const router = useRouter();

    const data = useMemo(() => {
        const categoryMap = new Map();

        expenses.forEach((expense) => {
            if (expense.type !== 'EXPENSE') return;

            const categoryName = expense.category?.name || 'Uncategorized';
            const categoryId = expense.category?.id;
            const color = expense.category?.color || 'var(--muted)';

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, { name: categoryName, value: 0, color, categoryId });
            }

            const current = categoryMap.get(categoryName);
            current.value += expense.amount;
        });

        return Array.from(categoryMap.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 categories
    }, [expenses]);

    if (data.length === 0) {
        return (
            <Card className="p-6 border-border/50 shadow-sm h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Category Breakdown</h3>
                <p className="text-muted-foreground">No expense data available for this period.</p>
            </Card>
        )
    }

    return (
        <Card className="p-6 border-border/50 shadow-sm flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Spending by Category</h3>
                <p className="text-sm text-muted-foreground">Where your money went</p>
            </div>
            <div className="h-[300px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data) => {
                                if (data.categoryId) {
                                    router.push(`/categories/${data.categoryId}`);
                                }
                            }}
                            cursor="pointer"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
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
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconType="circle"
                            formatter={(value) => (
                                <span className="text-sm text-muted-foreground ml-2">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

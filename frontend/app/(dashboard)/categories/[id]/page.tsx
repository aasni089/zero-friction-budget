'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUiStore } from '@/lib/stores/ui';
import { getCategoryAnalytics, type CategoryAnalytics } from '@/lib/api/category-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Users } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

export default function CategoryAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { currentHouseholdId } = useUiStore();
    const categoryId = params.id as string;

    const [analytics, setAnalytics] = useState<CategoryAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: subMonths(new Date(), 6),
        end: new Date()
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!categoryId) return;

            try {
                setIsLoading(true);
                const data = await getCategoryAnalytics(
                    categoryId,
                    dateRange.start.toISOString(),
                    dateRange.end.toISOString()
                );
                setAnalytics(data);
            } catch (error) {
                console.error('Failed to fetch category analytics:', error);
                toast.error('Failed to load category analytics');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [categoryId, dateRange]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">Category not found</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const { category, summary, monthlyBreakdown, topSpenders } = analytics;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                        style={{ backgroundColor: `${category.color}20` }}
                    >
                        {category.icon || '📦'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            Analytics for {format(dateRange.start, 'MMM yyyy')} - {format(dateRange.end, 'MMM yyyy')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary.expenseCount} transactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.averagePerMonth)}</div>
                        <p className="text-xs text-muted-foreground">
                            Per month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.averagePerExpense)}</div>
                        <p className="text-xs text-muted-foreground">
                            Per expense
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Spending Trend</CardTitle>
                        {summary.trend === 'increasing' ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : summary.trend === 'decreasing' ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                            <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{summary.trend}</div>
                        <p className="text-xs text-muted-foreground">
                            Compared to previous period
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Monthly Trend Chart */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Spending Over Time</CardTitle>
                        <CardDescription>Monthly spending in {category.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={(value) => format(new Date(value), 'MMM')}
                                />
                                <YAxis
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    labelFormatter={(label) => format(new Date(label), 'MMMM yyyy')}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke={category.color || '#8884d8'}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Spenders */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Spenders</CardTitle>
                        <CardDescription>Who spends the most on {category.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topSpenders.map((spender) => (
                                <div key={spender.userId} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                                            {spender.userName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{spender.userName}</p>
                                            <p className="text-xs text-muted-foreground">{spender.count} transactions</p>
                                        </div>
                                    </div>
                                    <div className="font-medium">
                                        {formatCurrency(spender.total)}
                                    </div>
                                </div>
                            ))}
                            {topSpenders.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No spending data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Breakdown Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Breakdown</CardTitle>
                        <CardDescription>Detailed monthly view</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {monthlyBreakdown.slice().reverse().map((month) => (
                                <div key={month.month} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                            {format(new Date(month.month), 'MMMM yyyy')}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {formatCurrency(month.total)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

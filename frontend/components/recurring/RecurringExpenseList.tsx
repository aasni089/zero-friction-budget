'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import {
    getRecurringExpenses,
    deleteRecurringExpense,
    updateRecurringExpense,
    createRecurringExpense,
    type RecurringExpense,
    type CreateRecurringExpenseData,
    type UpdateRecurringExpenseData,
    toggleRecurringExpense
} from '@/lib/api/recurring-expense-client';
import { RecurringExpenseDialog } from './RecurringExpenseDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
    Plus,
    MoreHorizontal,
    Calendar,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    RefreshCw,
    Play,
    Pause,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function RecurringExpenseList() {
    const router = useRouter();
    const { currentHouseholdId, households, budgets, setBudgets } = useUiStore();
    const [budgetsLoading, setBudgetsLoading] = useState(false);

    const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | undefined>(undefined);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

    const fetchExpenses = async () => {
        if (!currentHouseholdId) return;

        try {
            setIsLoading(true);
            const response = await getRecurringExpenses(currentHouseholdId);
            setExpenses(response.recurringExpenses || []);
        } catch (error) {
            console.error('Failed to fetch recurring expenses:', error);
            toast.error('Failed to load recurring expenses');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch budgets if not loaded
    useEffect(() => {
        const loadBudgets = async () => {
            if (!currentHouseholdId) return;
            if (budgets.length > 0) return; // Already have budgets

            try {
                setBudgetsLoading(true);
                // Dynamically import to avoid circular dependencies if any, though not strictly necessary here
                const { getBudgets } = await import('@/lib/api/budget-client');
                const response = await getBudgets(currentHouseholdId);
                setBudgets(response || []);
            } catch (error) {
                console.error('Failed to fetch budgets:', error);
            } finally {
                setBudgetsLoading(false);
            }
        };

        loadBudgets();
    }, [currentHouseholdId, budgets.length, setBudgets]);

    useEffect(() => {
        fetchExpenses();
    }, [currentHouseholdId]);

    const handleCreate = async (data: CreateRecurringExpenseData | UpdateRecurringExpenseData) => {
        try {
            await createRecurringExpense(data as CreateRecurringExpenseData);
            toast.success('Recurring expense created');
            fetchExpenses();
        } catch (error) {
            console.error('Failed to create recurring expense:', error);
            toast.error('Failed to create recurring expense');
            throw error; // Re-throw to let dialog know it failed
        }
    };

    const handleUpdate = async (data: CreateRecurringExpenseData | UpdateRecurringExpenseData) => {
        if (!editingExpense) return;

        try {
            await updateRecurringExpense(editingExpense.id, data as UpdateRecurringExpenseData);
            toast.success('Recurring expense updated');
            fetchExpenses();
            setEditingExpense(undefined);
        } catch (error) {
            console.error('Failed to update recurring expense:', error);
            toast.error('Failed to update recurring expense');
            throw error;
        }
    };

    const handleDelete = async () => {
        if (!deletingExpenseId) return;

        try {
            await deleteRecurringExpense(deletingExpenseId);
            toast.success('Recurring expense deleted');
            setExpenses(expenses.filter(e => e.id !== deletingExpenseId));
        } catch (error) {
            console.error('Failed to delete recurring expense:', error);
            toast.error('Failed to delete recurring expense');
        } finally {
            setDeletingExpenseId(null);
        }
    };

    const handleToggle = async (expense: RecurringExpense) => {
        try {
            await toggleRecurringExpense(expense.id);
            toast.success(`Recurring expense ${expense.isActive ? 'paused' : 'resumed'}`);

            // Optimistic update
            setExpenses(expenses.map(e =>
                e.id === expense.id ? { ...e, isActive: !e.isActive } : e
            ));

            // Refetch to ensure sync
            fetchExpenses();
        } catch (error) {
            console.error('Failed to toggle recurring expense:', error);
            toast.error('Failed to update recurring expense status');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 space-y-8">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-[100px]" />
                </div>
                {/* Content skeleton */}
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (households.length === 0) {
        return <EmptyState type="household" />;
    }

    if (!currentHouseholdId) {
        return <EmptyState type="household" />;
    }

    return (
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 space-y-8">
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
                        <h1 className="text-3xl font-bold tracking-tight">Recurring Expenses</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your recurring expenses and subscriptions
                        </p>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    disabled={budgets.length === 0}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New
                                </Button>
                            </span>
                        </TooltipTrigger>
                        {budgets.length === 0 && (
                            <TooltipContent>
                                <p>You need to create a budget first</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Active Subscriptions</h2>
                            <p className="text-sm text-muted-foreground">Manage your recurring payments</p>
                        </div>
                        <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            {expenses.length} active
                        </div>
                    </div>

                    {expenses.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="bg-primary/10 p-4 rounded-full mb-4">
                                    <RefreshCw className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-medium">No recurring expenses</h3>
                                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                                    Set up recurring expenses like rent, subscriptions, or utilities to track them automatically.
                                </p>
                                <Button onClick={() => setIsCreateDialogOpen(true)}>
                                    Create your first recurring expense
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {expenses.map((expense) => (
                                <div
                                    key={expense.id}
                                    className="group relative bg-card hover:bg-accent/5 border rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                                                style={{
                                                    backgroundColor: expense.category?.color ? `${expense.category.color}20` : 'var(--muted)',
                                                    color: expense.category?.color || 'var(--foreground)'
                                                }}
                                            >
                                                {expense.category?.icon || '💰'}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold leading-none truncate max-w-[120px]" title={expense.description || 'No description'}>
                                                    {expense.description || 'No description'}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {expense.category?.name || 'Uncategorized'}
                                                </p>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggle(expense)}>
                                                    {expense.isActive ? (
                                                        <>
                                                            <Pause className="mr-2 h-4 w-4" />
                                                            Pause
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="mr-2 h-4 w-4" />
                                                            Resume
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => setDeletingExpenseId(expense.id)}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-2xl font-bold tracking-tight">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wide">
                                                    {expense.frequency}
                                                </span>
                                                <span className={cn(
                                                    "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                                                    expense.isActive
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                )}>
                                                    {expense.isActive ? (
                                                        <><CheckCircle2 className="h-3 w-3" /> Active</>
                                                    ) : (
                                                        <><Pause className="h-3 w-3" /> Paused</>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>Next: {format(new Date(expense.nextRun), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Expenses Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Upcoming</h2>
                        <p className="text-sm text-muted-foreground">Next 5 scheduled payments</p>
                    </div>

                    <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="p-0">
                            {expenses.filter(e => e.isActive).length === 0 ? (
                                <div className="text-center py-12 border rounded-xl border-dashed bg-muted/30">
                                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-sm text-muted-foreground">No upcoming payments</p>
                                </div>
                            ) : (
                                <div className="relative pl-4 border-l-2 border-muted space-y-8 py-2">
                                    {expenses
                                        .filter(e => e.isActive)
                                        .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
                                        .slice(0, 5)
                                        .map((expense, index) => (
                                            <div key={expense.id} className="relative">
                                                {/* Timeline dot */}
                                                <div className={cn(
                                                    "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background",
                                                    index === 0 ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/30"
                                                )} />

                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                            {format(new Date(expense.nextRun), 'MMM d')}
                                                        </p>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(expense.nextRun), 'EEEE')}
                                                        </span>
                                                    </div>

                                                    <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                                                    style={{
                                                                        backgroundColor: expense.category?.color ? `${expense.category.color}15` : 'var(--muted)',
                                                                        color: expense.category?.color || 'var(--foreground)'
                                                                    }}
                                                                >
                                                                    {expense.category?.icon || '💰'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm leading-none group-hover:text-primary transition-colors">
                                                                        {expense.description || 'Payment'}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {expense.category?.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="font-semibold text-sm">
                                                                {formatCurrency(expense.amount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Dialog */}
            <RecurringExpenseDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                primaryBudgetId={budgets.find(b => b.isPrimary)?.id}
                onSubmit={handleCreate}
            />

            {/* Edit Dialog */}
            <RecurringExpenseDialog
                open={!!editingExpense}
                onOpenChange={(open) => !open && setEditingExpense(undefined)}
                expenseToEdit={editingExpense}
                onSubmit={handleUpdate}
            />

            {/* Delete Alert */}
            <AlertDialog open={!!deletingExpenseId} onOpenChange={(open) => !open && setDeletingExpenseId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this recurring expense. It will no longer generate new expenses, but existing expenses generated by it will remain.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

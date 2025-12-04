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

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Recurring Expenses</CardTitle>
                            <CardDescription>
                                Your scheduled expenses that run automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="bg-muted/50 p-4 rounded-full mb-4">
                                        <RefreshCw className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium">No recurring expenses</h3>
                                    <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                                        Set up recurring expenses like rent, subscriptions, or utilities to track them automatically.
                                    </p>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                                        Create your first recurring expense
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Frequency</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Next Run</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.map((expense) => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="font-medium">
                                                    {expense.description || 'No description'}
                                                </TableCell>
                                                <TableCell>
                                                    {expense.category ? (
                                                        <div className="flex items-center gap-2">
                                                            {expense.category.icon && (
                                                                <span>{expense.category.icon}</span>
                                                            )}
                                                            <span>{expense.category.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Uncategorized</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="capitalize bg-secondary px-2 py-1 rounded-md text-xs font-medium">
                                                            {expense.frequency.toLowerCase()}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(expense.nextRun), 'MMM d, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${expense.isActive
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                        }`}>
                                                        {expense.isActive ? 'Active' : 'Paused'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Open menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                onClick={() => setEditingExpense(expense)}
                                                            >
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggle(expense)}
                                                            >
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
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Expenses Section */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming</CardTitle>
                            <CardDescription>
                                Next 5 scheduled expenses
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {expenses.filter(e => e.isActive).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No active recurring expenses
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {expenses
                                        .filter(e => e.isActive)
                                        .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
                                        .slice(0, 5)
                                        .map((expense) => (
                                            <div key={expense.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">
                                                        {expense.description || 'Recurring Expense'}
                                                    </p>
                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                        <Calendar className="mr-1 h-3 w-3" />
                                                        {format(new Date(expense.nextRun), 'MMM d, yyyy')}
                                                    </div>
                                                </div>
                                                <div className="font-medium text-sm">
                                                    {formatCurrency(expense.amount)}
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

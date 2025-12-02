'use client';

import { useState } from 'react';
import { type Budget } from '@/lib/api/budget-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EditBudgetDialog } from './EditBudgetDialog';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUiStore } from '@/lib/stores/ui';
import { deleteBudget } from '@/lib/api/budget-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BudgetCardProps {
    budget: Budget;
}

export function BudgetCard({ budget }: BudgetCardProps) {
    const { budgets, setBudgets } = useUiStore();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Calculate progress (fallback if backend doesn't provide it yet)
    // Note: Backend implementation of progress calculation is needed for this to be accurate
    const progress = budget.progress || {
        totalSpent: 0,
        remaining: budget.amount,
        percentage: 0,
        status: 'on_track' as const,
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteBudget(budget.id);

            // Update store
            setBudgets(budgets.filter(b => b.id !== budget.id));
            toast.success('Budget deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete budget:', error);
            toast.error(error?.message || 'Failed to delete budget');
        } finally {
            setIsDeleting(false);
        }
    };

    // Determine progress bar color based on status/percentage
    const getProgressColor = () => {
        if (progress.percentage >= 100) return 'bg-red-500';
        if (progress.percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <>
            <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                {budget.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 capitalize">
                                {budget.period.toLowerCase()} Budget
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditOpen(true)}
                                className="text-gray-500 hover:text-blue-600"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-500 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete "{budget.name}"? This action cannot be undone.
                                            Expenses associated with this budget will not be deleted, but they will be unlinked.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">
                                ${progress.totalSpent.toFixed(2)} spent
                            </span>
                            <span className="text-gray-500">
                                of ${budget.amount.toFixed(2)}
                            </span>
                        </div>

                        <Progress
                            value={Math.min(progress.percentage, 100)}
                            className="h-2"
                            indicatorClassName={getProgressColor()}
                        />

                        <div className="flex justify-between items-center text-xs">
                            <span className={cn(
                                "font-medium",
                                progress.remaining < 0 ? "text-red-600" : "text-gray-600"
                            )}>
                                {progress.remaining < 0
                                    ? `$${Math.abs(progress.remaining).toFixed(2)} over budget`
                                    : `$${progress.remaining.toFixed(2)} left`
                                }
                            </span>
                            <span className="text-gray-400">
                                {Math.round(progress.percentage)}%
                            </span>
                        </div>
                    </div>

                    {/* Line Items Breakdown (if exists) */}
                    {budget.categories && budget.categories.length > 0 && (
                        <div className="pt-4 border-t space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Category Allocations</h4>
                            <div className="space-y-1">
                                {budget.categories.map((cat) => (
                                    <div key={cat.id} className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            {cat.category?.color && (
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: cat.category.color }}
                                                />
                                            )}
                                            <span className="text-gray-600">
                                                {cat.category?.name || 'Unknown'}
                                            </span>
                                        </div>
                                        <span className="font-medium text-gray-700">
                                            ${cat.allocatedAmount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <EditBudgetDialog
                budget={budget}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
        </>
    );
}

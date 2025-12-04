'use client';

import { useState } from 'react';
import { type Budget, updateBudget } from '@/lib/api/budget-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EditBudgetDialog } from './EditBudgetDialog';
import { SelectPrimaryBudgetDialog } from './SelectPrimaryBudgetDialog';
import { Pencil, Trash2, AlertCircle, Star } from 'lucide-react';
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
import { deleteBudget } from '@/lib/api/budget-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/stores/ui';

interface BudgetCardProps {
    budget: Budget;
    onTogglePrimary?: (budgetId: string, isPrimary: boolean) => void;
    onDelete?: (budgetId: string) => void;
    isUpdating?: boolean;
}

export function BudgetCard({ budget, onTogglePrimary, onDelete, isUpdating }: BudgetCardProps) {
    const { budgets } = useUiStore();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSelectPrimaryOpen, setIsSelectPrimaryOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Calculate progress (fallback if backend doesn't provide it yet)
    // Note: Backend implementation of progress calculation is needed for this to be accurate
    const progress = budget.progress || {
        totalSpent: 0,
        remaining: budget.amount,
        percentage: 0,
        status: 'on_track' as const,
    };

    const handleDeleteClick = () => {
        // Check if this is the primary budget and there are other budgets available
        if (budget.isPrimary && budgets.length > 1) {
            setIsSelectPrimaryOpen(true);
        } else {
            setShowDeleteConfirm(true);
        }
    };

    const handlePrimarySelection = async (newPrimaryId: string) => {
        try {
            // First set the new primary budget
            await updateBudget(newPrimaryId, { isPrimary: true });

            // Optimistic update: Set new primary in store immediately
            useUiStore.getState().updateBudget(newPrimaryId, { isPrimary: true });

            // Then delete the current budget
            await performDelete();
        } catch (error: any) {
            console.error('Failed to update primary budget:', error);
            toast.error('Failed to set new primary budget');
            // Revert optimistic update if needed (optional, but good practice)
            useUiStore.getState().updateBudget(newPrimaryId, { isPrimary: false });
            throw error; // Re-throw to be caught by the dialog
        }
    };

    const performDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteBudget(budget.id);

            // Optimistic update: Remove from store immediately
            useUiStore.getState().deleteBudget(budget.id);

            // Notify parent to update its state (if it still relies on this)
            if (onDelete) {
                onDelete(budget.id);
            }
            toast.success('Budget deleted successfully');
            setShowDeleteConfirm(false);
        } catch (error: any) {
            console.error('Failed to delete budget:', error);
            toast.error(error?.message || 'Failed to delete budget');
        } finally {
            setIsDeleting(false);
        }
    };

    // Determine progress bar color based on status/percentage
    // Green: <70%, Yellow: 70-90%, Red: ≥90%
    const getProgressColor = () => {
        if (progress.percentage >= 90) return 'bg-red-500';
        if (progress.percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <>
            <Card className="p-6 hover:shadow-md transition-shadow border-border/50">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-foreground">
                                {budget.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 capitalize">
                                {budget.period.toLowerCase()} Budget
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onTogglePrimary?.(budget.id, !budget.isPrimary)}
                                className="text-muted-foreground hover:text-yellow-500"
                                title={budget.isPrimary ? "Remove as primary budget" : "Set as primary budget"}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <div className="h-4 w-4 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin" />
                                ) : (
                                    <Star
                                        className={`h-4 w-4 ${budget.isPrimary
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-400'
                                            }`}
                                    />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditOpen(true)}
                                className="text-muted-foreground hover:text-primary"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteClick}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">
                                ${progress.totalSpent.toFixed(2)} spent
                            </span>
                            <span className="text-muted-foreground">
                                of ${budget.amount.toFixed(2)}
                            </span>
                        </div>

                        <Progress
                            value={Math.min(progress.percentage, 100)}
                            className="h-3 rounded-full bg-secondary"
                            indicatorClassName={getProgressColor()}
                        />

                        <div className="flex justify-between items-center text-xs">
                            <span className={cn(
                                "font-medium",
                                progress.remaining < 0 ? "text-destructive" : "text-green-600"
                            )}>
                                {progress.remaining < 0
                                    ? `$${Math.abs(progress.remaining).toFixed(2)} over budget`
                                    : `$${progress.remaining.toFixed(2)} under budget`
                                }
                            </span>
                            <span className="text-muted-foreground">
                                {Math.round(progress.percentage)}%
                            </span>
                        </div>
                    </div>

                    {/* Line Items Breakdown (if exists) */}
                    {budget.categories && budget.categories.length > 0 && (
                        <div className="pt-4 border-t border-border/50 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allocations</h4>
                            <div className="space-y-3">
                                {budget.categories.map((cat) => {
                                    const spent = cat.spent || 0;
                                    const allocated = cat.allocatedAmount;
                                    const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                                    const remaining = allocated - spent;

                                    // Progress bar color based on usage
                                    let progressColor = 'bg-green-500';
                                    if (percentage >= 90) progressColor = 'bg-red-500';
                                    else if (percentage >= 70) progressColor = 'bg-yellow-500';

                                    return (
                                        <div key={cat.id} className="space-y-1.5">
                                            <div className="flex justify-between text-sm items-center">
                                                <div className="flex items-center gap-2">
                                                    {cat.category?.color && (
                                                        <div
                                                            className="w-2 h-2 rounded-full ring-1 ring-border"
                                                            style={{ backgroundColor: cat.category.color }}
                                                        />
                                                    )}
                                                    <span className="text-foreground/80">
                                                        {cat.category?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-foreground">
                                                    ${cat.allocatedAmount.toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Compact Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${progressColor}`}
                                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">${spent.toFixed(2)} spent</span>
                                                    <span className={cn("font-medium", remaining < 0 ? 'text-red-600' : 'text-green-600')}>
                                                        ${Math.abs(remaining).toFixed(2)} {remaining < 0 ? 'over budget' : 'under budget'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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

            <SelectPrimaryBudgetDialog
                open={isSelectPrimaryOpen}
                onOpenChange={setIsSelectPrimaryOpen}
                budgets={budgets}
                currentBudgetId={budget.id}
                onConfirm={handlePrimarySelection}
            />

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
                            onClick={performDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

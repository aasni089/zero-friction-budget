'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { updateBudget, type Budget } from '@/lib/api/budget-client';
import { getCategories, type Category } from '@/lib/api/category-client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditBudgetDialogProps {
    budget: Budget;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditBudgetDialog({
    budget,
    open,
    onOpenChange,
    onSuccess,
}: EditBudgetDialogProps) {
    const { currentHouseholdId, budgets, setBudgets } = useUiStore();

    // Form state
    const [name, setName] = useState(budget.name);
    const [amount, setAmount] = useState(budget.amount.toString());
    const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>(budget.period);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when budget changes
    useEffect(() => {
        if (open) {
            setName(budget.name);
            setAmount(budget.amount.toString());
            setPeriod(budget.period);
        }
    }, [budget, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsSubmitting(true);

            const updatedBudget = await updateBudget(budget.id, {
                name,
                amount: parseFloat(amount),
                period,
            });

            toast.success('Budget updated successfully');

            // Update store
            const updatedBudgets = budgets.map(b =>
                b.id === budget.id ? updatedBudget : b
            );
            setBudgets(updatedBudgets);

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Failed to update budget:', error);
            toast.error(error?.message || 'Failed to update budget');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Budget</DialogTitle>
                    <DialogDescription>
                        Update your budget details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Budget Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Budget Name</Label>
                        <Input
                            id="edit-name"
                            placeholder="e.g. Monthly Groceries"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-amount">Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                $
                            </span>
                            <Input
                                id="edit-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-period">Period</Label>
                        <Select
                            value={period}
                            onValueChange={(value: 'WEEKLY' | 'MONTHLY' | 'YEARLY') => setPeriod(value)}
                        >
                            <SelectTrigger id="edit-period">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="YEARLY">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

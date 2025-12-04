'use client';

import { useState } from 'react';
import { type Budget } from '@/lib/api/budget-client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';

interface SelectPrimaryBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    budgets: Budget[];
    currentBudgetId: string;
    onConfirm: (newPrimaryId: string) => Promise<void>;
}

export function SelectPrimaryBudgetDialog({
    open,
    onOpenChange,
    budgets,
    currentBudgetId,
    onConfirm,
}: SelectPrimaryBudgetDialogProps) {
    const [selectedId, setSelectedId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out the current budget being deleted
    const availableBudgets = budgets.filter(b => b.id !== currentBudgetId);

    const handleConfirm = async () => {
        if (!selectedId) return;

        try {
            setIsSubmitting(true);
            await onConfirm(selectedId);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to set new primary budget:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-yellow-600 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">Action Required</span>
                    </div>
                    <DialogTitle>Select New Primary Budget</DialogTitle>
                    <DialogDescription>
                        You are deleting your primary budget. Please select another budget to become the new primary budget for this household.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Select
                        value={selectedId}
                        onValueChange={setSelectedId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a budget" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableBudgets.map((budget) => (
                                <SelectItem key={budget.id} value={budget.id}>
                                    {budget.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Set Primary & Delete'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

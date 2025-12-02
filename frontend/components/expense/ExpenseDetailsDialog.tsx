'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import type { Category } from '@/lib/api/category-client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExpenseDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    amount: number;
    onSubmit: (details: {
        budgetId?: string;
        categoryId?: string;
        description?: string;
        date: Date;
    }) => void;
}

export function ExpenseDetailsDialog({
    open,
    onOpenChange,
    amount,
    onSubmit,
}: ExpenseDetailsDialogProps) {
    const { budgets } = useUiStore();

    // Form state
    const [budgetId, setBudgetId] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setBudgetId('');
            setCategoryId('');
            setDescription('');
            setDate(new Date());
        }
    }, [open]);

    // Reset category when budget changes
    useEffect(() => {
        setCategoryId('');
    }, [budgetId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!budgetId) {
            toast.error('Please select a budget');
            return;
        }

        if (!categoryId) {
            toast.error('Please select a category');
            return;
        }

        onSubmit({
            budgetId,
            categoryId,
            description: description || undefined,
            date,
        });

        onOpenChange(false);
    };

    // Get available categories based on selected budget's line items
    const availableCategories = budgetId
        ? budgets
            .find((b) => b.id === budgetId)
            ?.categories?.map((bc: any) => bc.category)
            .filter((c: any): c is Category => c !== null && c !== undefined) || []
        : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-600">
                            ${amount.toFixed(2)}
                        </span>
                        <span className="text-gray-500">-</span>
                        <span>Expense Details</span>
                    </DialogTitle>
                    <DialogDescription>
                        Complete the details for your ${amount.toFixed(2)} expense
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Budget Selector - REQUIRED */}
                    <div className="space-y-2">
                        <Label htmlFor="budget">
                            Budget <span className="text-red-500">*</span>
                        </Label>
                        <Select value={budgetId} onValueChange={setBudgetId}>
                            <SelectTrigger id="budget">
                                <SelectValue placeholder="Select a budget" />
                            </SelectTrigger>
                            <SelectContent>
                                {budgets.map((budget) => (
                                    <SelectItem key={budget.id} value={budget.id}>
                                        {budget.name} - ${budget.amount.toFixed(2)}/{budget.period.toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Selector - filtered by budget */}
                    <div className="space-y-2">
                        <Label htmlFor="category">
                            Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={categoryId}
                            onValueChange={setCategoryId}
                            disabled={!budgetId || availableCategories.length === 0}
                        >
                            <SelectTrigger id="category">
                                <SelectValue placeholder={
                                    !budgetId
                                        ? "Select a budget first"
                                        : availableCategories.length === 0
                                            ? "No categories in this budget"
                                            : "Select category"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map((category: Category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        <div className="flex items-center gap-2">
                                            {category.color && (
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                            )}
                                            {category.icon && <span>{category.icon}</span>}
                                            <span>{category.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {budgetId && availableCategories.length === 0 && (
                            <p className="text-xs text-orange-600">
                                This budget has no category line items configured
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What was this for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(newDate) => {
                                        if (newDate) {
                                            setDate(newDate);
                                            setIsCalendarOpen(false);
                                        }
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Expense
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

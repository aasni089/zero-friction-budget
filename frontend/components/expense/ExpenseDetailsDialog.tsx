'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
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
    primaryBudgetId?: string;
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
    primaryBudgetId,
    onSubmit,
}: ExpenseDetailsDialogProps) {
    const { budgets, currentHouseholdId } = useUiStore();

    // Form state - budget defaults to primary but can be changed
    const [budgetId, setBudgetId] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Data state
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Fetch categories when dialog opens or budget changes
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentHouseholdId || !open || !budgetId) return;

            try {
                setIsLoadingCategories(true);
                console.log('[ExpenseDetailsDialog] Fetching categories for budgetId:', budgetId);
                // Fetch only line item categories for the selected budget
                const response = await getCategories(currentHouseholdId, budgetId, true);
                console.log('[ExpenseDetailsDialog] Received categories:', response.categories?.length, 'categories');
                console.log('[ExpenseDetailsDialog] Category budgetIds:', response.categories?.map(c => ({ name: c.name, budgetId: c.budgetId })));
                setCategories(response.categories || []);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                toast.error('Failed to load categories');
            } finally {
                setIsLoadingCategories(false);
            }
        };

        fetchCategories();
    }, [currentHouseholdId, budgetId, open]);

    // Auto-select primary budget when dialog opens, reset on close
    useEffect(() => {
        if (!open) {
            setBudgetId('');
            setCategoryId('');
            setDescription('');
            setDate(new Date());
        } else if (primaryBudgetId) {
            console.log('[ExpenseDetailsDialog] Auto-selecting primary budget:', primaryBudgetId);
            setBudgetId(primaryBudgetId);
        }
    }, [open, primaryBudgetId]);

    // Reset category when budget changes
    useEffect(() => {
        setCategoryId('');
    }, [budgetId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!budgetId) {
            toast.error('Please select a budget');
            return;
        }

        if (!categoryId) {
            toast.error('Please select a category');
            return;
        }

        const submissionData: any = {
            budgetId,
            categoryId,
            date,
        };

        // Only include description if it's set
        if (description) {
            submissionData.description = description;
        }

        onSubmit(submissionData);
        onOpenChange(false);
    };


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
                    {/* Budget Selector - defaults to primary */}
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

                    {/* Category Selector - shows household + selected budget categories */}
                    <div className="space-y-2">
                        <Label htmlFor="category">
                            Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={categoryId}
                            onValueChange={setCategoryId}
                            disabled={isLoadingCategories || categories.length === 0}
                        >
                            <SelectTrigger id="category">
                                <SelectValue placeholder={
                                    isLoadingCategories
                                        ? "Loading categories..."
                                        : categories.length === 0
                                            ? "No categories available"
                                            : "Select category"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category: Category) => (
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
                        {!isLoadingCategories && categories.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No categories available. Create one in the Categories page.
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

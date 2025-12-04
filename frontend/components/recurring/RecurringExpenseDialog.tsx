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
import { Input } from '@/components/ui/input';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CreateRecurringExpenseData, UpdateRecurringExpenseData, RecurringExpense } from '@/lib/api/recurring-expense-client';

interface RecurringExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expenseToEdit?: RecurringExpense;
    primaryBudgetId?: string;
    onSubmit: (data: CreateRecurringExpenseData | UpdateRecurringExpenseData) => Promise<void>;
}

export function RecurringExpenseDialog({
    open,
    onOpenChange,
    expenseToEdit,
    primaryBudgetId,
    onSubmit,
}: RecurringExpenseDialogProps) {
    const { currentHouseholdId, budgets } = useUiStore();

    // Form state
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [categoryId, setCategoryId] = useState<string>('');
    const [budgetId, setBudgetId] = useState<string>('');

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isStartDateOpen, setIsStartDateOpen] = useState(false);
    const [isEndDateOpen, setIsEndDateOpen] = useState(false);

    // Auto-select primary budget when dialog opens, reset on close
    useEffect(() => {
        if (!open) {
            setBudgetId('');
            setCategoryId('');
            setAmount('');
            setDescription('');
            setFrequency('MONTHLY');
            setStartDate(new Date());
            setEndDate(undefined);
        } else if (expenseToEdit) {
            // Populate form when editing
            setAmount(expenseToEdit.amount.toString());
            setDescription(expenseToEdit.description || '');
            setFrequency(expenseToEdit.frequency);
            setStartDate(new Date(expenseToEdit.startDate));
            setEndDate(expenseToEdit.endDate ? new Date(expenseToEdit.endDate) : undefined);
            setCategoryId(expenseToEdit.categoryId || '');
            setBudgetId(expenseToEdit.budgetId || '');
        } else if (primaryBudgetId) {
            // Auto-select primary budget for new expense
            console.log('[RecurringExpenseDialog] Auto-selecting primary budget:', primaryBudgetId);
            setBudgetId(primaryBudgetId);
        }
    }, [open, primaryBudgetId, expenseToEdit]);

    // Reset category when budget changes
    useEffect(() => {
        setCategoryId('');
    }, [budgetId]);

    // Fetch categories when dialog opens or budget changes
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentHouseholdId || !open || !budgetId) return;

            try {
                setIsLoadingCategories(true);
                // Fetch only line item categories for the selected budget
                const response = await getCategories(currentHouseholdId, budgetId, true);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentHouseholdId) return;

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!categoryId) {
            toast.error('Please select a category');
            return;
        }

        try {
            setIsSubmitting(true);

            const data: any = {
                amount: parseFloat(amount),
                frequency,
                startDate: startDate.toISOString(),
                categoryId,
            };

            // Add required day parameters based on frequency
            // These are derived from the startDate
            if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
                data.dayOfWeek = startDate.getDay(); // 0=Sunday, 6=Saturday
            }
            if (frequency === 'MONTHLY' || frequency === 'QUARTERLY') {
                data.dayOfMonth = startDate.getDate();
            }
            if (frequency === 'YEARLY') {
                data.dayOfMonth = startDate.getDate();
                data.monthOfYear = startDate.getMonth() + 1; // 1-indexed
            }

            // Only include description if provided
            if (description) {
                data.description = description;
            }

            // Only include endDate if provided
            if (endDate) {
                data.endDate = endDate.toISOString();
            }

            // Only include budgetId if provided
            if (budgetId) {
                data.budgetId = budgetId;
            }

            if (!expenseToEdit) {
                data.householdId = currentHouseholdId;
            }

            await onSubmit(data);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to submit recurring expense:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {expenseToEdit ? 'Edit Recurring Expense' : 'New Recurring Expense'}
                    </DialogTitle>
                    <DialogDescription>
                        {expenseToEdit
                            ? 'Update the details of your recurring expense.'
                            : 'Set up a new recurring expense to track automatically.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">
                            Amount <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-2">
                        <Label htmlFor="budget">
                            Budget <span className="text-red-500">*</span>
                        </Label>
                        <Select value={budgetId} onValueChange={setBudgetId}>
                            <SelectTrigger id="budget">
                                <SelectValue placeholder="Select budget" />
                            </SelectTrigger>
                            <SelectContent>
                                {budgets.map((budget) => (
                                    <SelectItem key={budget.id} value={budget.id}>
                                        <div className="flex items-center gap-2">
                                            {budget.isPrimary && <span className="text-yellow-500">★</span>}
                                            <span>{budget.name}</span>
                                            <span className="text-xs text-muted-foreground">({budget.period})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">
                            Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={categoryId}
                            onValueChange={setCategoryId}
                            disabled={isLoadingCategories || !budgetId}
                        >
                            <SelectTrigger id="category">
                                <SelectValue placeholder={!budgetId ? "Select a budget first" : isLoadingCategories ? "Loading..." : "Select category"} />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
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
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                        <Label htmlFor="frequency">
                            Frequency <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={frequency}
                            onValueChange={(val: any) => setFrequency(val)}
                        >
                            <SelectTrigger id="frequency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAILY">Daily</SelectItem>
                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                <SelectItem value="YEARLY">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !startDate && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={(date) => {
                                            if (date) {
                                                setStartDate(date);
                                                setIsStartDateOpen(false);
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date (Optional)</Label>
                            <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !endDate && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, 'PPP') : <span>No end date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={(date) => {
                                            setEndDate(date);
                                            setIsEndDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What is this recurring expense for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
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
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {expenseToEdit ? 'Save Changes' : 'Create Expense'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

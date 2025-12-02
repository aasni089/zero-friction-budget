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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Budget } from '@/lib/api/budget-client';

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
    const { currentHouseholdId, budgets } = useUiStore();

    // Form state
    const [budgetId, setBudgetId] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Data state
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Fetch categories when dialog opens
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentHouseholdId || !open) return;

            try {
                setIsLoadingCategories(true);
                const response = await getCategories(currentHouseholdId);
                setCategories(response.categories || []);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                toast.error('Failed to load categories');
            } finally {
                setIsLoadingCategories(false);
            }
        };

        fetchCategories();
    }, [currentHouseholdId, open]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setBudgetId('');
            setCategoryId('');
            setDescription('');
            setDate(new Date());
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!categoryId) {
            toast.error('Please select a category');
            return;
        }

        onSubmit({
            budgetId: budgetId && budgetId !== 'none' ? budgetId : undefined,
            categoryId,
            description: description || undefined,
            date,
        });

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Expense Details</DialogTitle>
                    <DialogDescription>
                        You're adding ${amount.toFixed(2)} - provide some details
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Budget Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="budget">Budget (Optional)</Label>
                        <Select value={budgetId} onValueChange={setBudgetId}>
                            <SelectTrigger id="budget">
                                <SelectValue placeholder="Select budget (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No budget</SelectItem>
                                {budgets.map((budget) => (
                                    <SelectItem key={budget.id} value={budget.id}>
                                        {budget.name} - ${budget.amount.toFixed(2)}/{budget.period.toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingCategories ? (
                                    <SelectItem value="loading" disabled>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </SelectItem>
                                ) : (
                                    categories.map((category) => (
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
                                    ))
                                )}
                            </SelectContent>
                        </Select>
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

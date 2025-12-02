'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { createBudget } from '@/lib/api/budget-client';
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
import { startOfMonth, format } from 'date-fns';

interface CreateBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CreateBudgetDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateBudgetDialogProps) {
    const { currentHouseholdId, budgets, setBudgets } = useUiStore();

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [categoryId, setCategoryId] = useState<string>('all'); // 'all' or specific category ID

    // Data state
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Auto-fill name when category is selected
    useEffect(() => {
        if (categoryId && categoryId !== 'all' && !name) {
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                setName(category.name);
            }
        }
    }, [categoryId, categories, name]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentHouseholdId) return;

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsSubmitting(true);

            // Default to first day of current month
            const startDate = startOfMonth(new Date()).toISOString();

            const budgetData: any = {
                name: name || (categoryId === 'all' ? 'General Budget' : categories.find(c => c.id === categoryId)?.name || 'Budget'),
                amount: parseFloat(amount),
                period,
                startDate,
                householdId: currentHouseholdId,
            };

            // If a specific category is selected, add it to the budget
            if (categoryId && categoryId !== 'all') {
                budgetData.categories = [{
                    categoryId,
                    allocatedAmount: parseFloat(amount) // Allocate full amount to this category for now
                }];
            }

            const newBudget = await createBudget(budgetData);

            toast.success('Budget created successfully');

            // Update store
            setBudgets([...budgets, newBudget]);

            // Reset form
            setName('');
            setAmount('');
            setPeriod('MONTHLY');
            setCategoryId('all');

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Failed to create budget:', error);
            toast.error(error?.message || 'Failed to create budget');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Budget</DialogTitle>
                    <DialogDescription>
                        Set up a budget to track your spending.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories (General)</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        <div className="flex items-center gap-2">
                                            {category.icon && <span>{category.icon}</span>}
                                            <span>{category.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Budget Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Budget Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Monthly Groceries"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                $
                            </span>
                            <Input
                                id="amount"
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
                        <Label htmlFor="period">Period</Label>
                        <Select
                            value={period}
                            onValueChange={(value: 'WEEKLY' | 'MONTHLY' | 'YEARLY') => setPeriod(value)}
                        >
                            <SelectTrigger id="period">
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
                                    Creating...
                                </>
                            ) : (
                                'Create Budget'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

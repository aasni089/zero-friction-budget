'use client';

import { useState, useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { createBudget } from '@/lib/api/budget-client';
import { getCategories, createCategory, type Category, type CreateCategoryData, type UpdateCategoryData } from '@/lib/api/category-client';
import { CategoryDialog } from '@/components/category/CategoryDialog';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth } from 'date-fns';

interface LineItem {
    id: string; // temporary ID for React keys
    categoryId: string;
    allocatedAmount: string;
}

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
    const {
        currentHouseholdId,
        budgets,
        setBudgets,
        categories: storeCategories,
        setCategories: setStoreCategories,
        categoriesLoading: storeCategoriesLoading,
        setCategoriesLoading: setStoreCategoriesLoading
    } = useUiStore();

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Data state
    // Use store categories if available
    const categories = storeCategories;
    const isLoadingCategories = storeCategoriesLoading;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Category Dialog state
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [activeLineItemId, setActiveLineItemId] = useState<string | null>(null);

    // Fetch categories when dialog opens if not already loaded
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentHouseholdId || !open) return;

            // If we already have categories, don't re-fetch unless forced
            if (storeCategories.length > 0) return;

            try {
                setStoreCategoriesLoading(true);
                const response = await getCategories(currentHouseholdId);
                setStoreCategories(response.categories || []);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
                toast.error('Failed to load categories');
            } finally {
                setStoreCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, [currentHouseholdId, open, storeCategories.length, setStoreCategories, setStoreCategoriesLoading]);

    // Add a new line item
    const handleAddLineItem = () => {
        setLineItems([
            ...lineItems,
            {
                id: Math.random().toString(36).substr(2, 9),
                categoryId: '',
                allocatedAmount: '',
            },
        ]);
    };

    // Remove a line item
    const handleRemoveLineItem = (id: string) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    // Update line item
    const handleUpdateLineItem = (id: string, field: keyof LineItem, value: string) => {
        setLineItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Create new category via dialog
    const handleCreateCategory = async (data: CreateCategoryData | UpdateCategoryData) => {
        if (!currentHouseholdId) return;

        try {
            const createData = { ...(data as CreateCategoryData), householdId: currentHouseholdId };
            const newCategory = await createCategory(createData);

            // If we have a pending line item that triggered this, update it
            if (activeLineItemId) {
                // Use setTimeout to ensure the store update propagates and the Select options re-render
                // before we set the value. This prevents the Select from showing empty.
                setTimeout(() => {
                    handleUpdateLineItem(activeLineItemId, 'categoryId', newCategory.id);
                    setActiveLineItemId(null);
                }, 0);
            }
        } catch (error: any) {
            console.error('Failed to create category:', error);
            toast.error(error?.message || 'Failed to create category');
            throw error;
        }
    };

    // Calculate total allocated
    const totalAllocated = lineItems.reduce((sum, item) => {
        const itemAmount = parseFloat(item.allocatedAmount) || 0;
        return sum + itemAmount;
    }, 0);

    const budgetAmount = parseFloat(amount) || 0;
    const remaining = budgetAmount - totalAllocated;
    const isOverBudget = budgetAmount > 0 && totalAllocated > budgetAmount;

    // Auto-increase budget if not set and line items are added
    useEffect(() => {
        if (lineItems.length > 0 && (!amount || budgetAmount === 0)) {
            setAmount(totalAllocated.toFixed(2));
        }
    }, [totalAllocated, lineItems.length, amount, budgetAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentHouseholdId) return;

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid budget amount');
            return;
        }

        if (!name.trim()) {
            toast.error('Please enter a budget name');
            return;
        }

        // Validate line items
        for (const item of lineItems) {
            if (!item.categoryId) {
                toast.error('All line items must have a category selected');
                return;
            }
            if (!item.allocatedAmount || parseFloat(item.allocatedAmount) <= 0) {
                toast.error('All line items must have a valid amount');
                return;
            }
        }

        // Check if total allocated exceeds budget
        if (totalAllocated > budgetAmount) {
            toast.error(`Allocated amount ($${totalAllocated.toFixed(2)}) exceeds budget ($${budgetAmount.toFixed(2)})`);
            return;
        }

        try {
            setIsSubmitting(true);

            // Default to first day of current month
            const startDate = startOfMonth(new Date()).toISOString();

            const budgetData: any = {
                name,
                amount: parseFloat(amount),
                period,
                startDate,
                householdId: currentHouseholdId,
            };

            // Add line items if any
            if (lineItems.length > 0) {
                budgetData.categories = lineItems.map(item => ({
                    categoryId: item.categoryId,
                    allocatedAmount: parseFloat(item.allocatedAmount),
                }));
            }

            const newBudget = await createBudget(budgetData);

            toast.success('Budget created successfully');

            // Update store
            setBudgets([...budgets, newBudget]);

            // Reset form
            setName('');
            setAmount('');
            setPeriod('MONTHLY');
            setLineItems([]);

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
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Budget</DialogTitle>
                        <DialogDescription>
                            Set up a budget to track your spending. Optionally allocate amounts to specific categories.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {/* Budget Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Budget Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Monthly Household Budget"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Total Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Total Budget Amount *</Label>
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
                            <Label htmlFor="period">Period *</Label>
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

                        {/* Line Items Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Category Line Items (Optional)</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddLineItem}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Line Item
                                </Button>
                            </div>

                            {lineItems.length > 0 && (
                                <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                                    {lineItems.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <Select
                                                    value={item.categoryId}
                                                    onValueChange={(value) => {
                                                        if (value === '__create_new__') {
                                                            setActiveLineItemId(item.id);
                                                            setIsCategoryDialogOpen(true);
                                                        } else {
                                                            handleUpdateLineItem(item.id, 'categoryId', value);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map((category) => (
                                                            <SelectItem
                                                                key={category.id}
                                                                value={category.id}
                                                                disabled={lineItems.some(li => li.categoryId === category.id && li.id !== item.id)}
                                                            >
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
                                                        <SelectItem value="__create_new__">
                                                            <span className="text-blue-600 font-medium">+ Create New Category</span>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-32">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                                        $
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        className="pl-5"
                                                        value={item.allocatedAmount}
                                                        onChange={(e) => handleUpdateLineItem(item.id, 'allocatedAmount', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveLineItem(item.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    {/* Summary */}
                                    <div className="border-t pt-2 mt-3 space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Allocated:</span>
                                            <span className="font-medium">${totalAllocated.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Budget Amount:</span>
                                            <span className="font-medium">${budgetAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-1">
                                            <span className="text-gray-600">Remaining:</span>
                                            <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ${remaining.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Warning when over budget */}
                                        {isOverBudget && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs mt-2">
                                                ⚠️ Allocated amount exceeds total budget!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {lineItems.length === 0 && (
                                <p className="text-sm text-gray-500 italic">
                                    No line items added. Budget will apply to all expenses.
                                </p>
                            )}
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

            <CategoryDialog
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                onSubmit={handleCreateCategory}
            />
        </>
    );
}

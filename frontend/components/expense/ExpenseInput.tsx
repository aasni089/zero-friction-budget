'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { getCategories, type Category } from '@/lib/api/category-client';
import { createExpense, getExpenses, type Expense } from '@/lib/api/expense-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Card } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// Form validation schema
const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export function ExpenseInput() {
  const { currentHouseholdId } = useUiStore();

  // Form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  // Refs
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentHouseholdId) return;

      try {
        setIsLoadingCategories(true);
        const response = await getCategories(currentHouseholdId);
        setCategories(response.categories || []);
      } catch (error: any) {
        console.error('Failed to fetch categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [currentHouseholdId]);

  // Fetch recent expenses
  const fetchRecentExpenses = useCallback(async () => {
    if (!currentHouseholdId) return;

    try {
      setIsLoadingExpenses(true);
      const response = await getExpenses({
        householdId: currentHouseholdId,
        limit: 10,
      });
      setRecentExpenses(response.expenses || []);
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [currentHouseholdId]);

  // Fetch recent expenses on mount
  useEffect(() => {
    fetchRecentExpenses();
  }, [fetchRecentExpenses]);

  // Auto-focus amount input
  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  // Format currency input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  // Clear form
  const clearForm = () => {
    setAmount('');
    setCategoryId('');
    setDescription('');
    setDate(new Date());
    amountInputRef.current?.focus();
  };

  // Validate and submit
  const handleSubmit = async () => {
    if (!currentHouseholdId) {
      toast.error('Please select a household');
      return;
    }

    try {
      // Parse and validate form data
      const formData: ExpenseFormData = {
        amount: parseFloat(amount),
        categoryId: categoryId || undefined,
        description: description || undefined,
        date,
      };

      const validated = expenseSchema.parse(formData);

      setIsSubmitting(true);

      // Create expense
      const response = await createExpense({
        amount: validated.amount,
        categoryId: validated.categoryId,
        description: validated.description,
        date: validated.date.toISOString(),
        householdId: currentHouseholdId,
      });

      // Success!
      toast.success(`Expense added: $${validated.amount.toFixed(2)}`);

      // Optimistic update - add to recent expenses
      setRecentExpenses((prev) => [response, ...prev.slice(0, 9)]);

      // Clear form
      clearForm();
    } catch (error: any) {
      console.error('Failed to create expense:', error);

      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast.error(firstError.message);
      } else {
        toast.error('Failed to add expense. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to submit (if amount is filled)
      if (e.key === 'Enter' && !e.shiftKey && amount) {
        e.preventDefault();
        handleSubmit();
      }

      // Escape to clear
      if (e.key === 'Escape') {
        e.preventDefault();
        clearForm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amount, categoryId, description, date, currentHouseholdId]);

  const isFormValid = amount && parseFloat(amount) > 0;

  // Group expenses by date for better organization
  const groupExpensesByDate = (expenses: Expense[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; expenses: Expense[] }[] = [
      { label: 'Today', expenses: [] },
      { label: 'Yesterday', expenses: [] },
      { label: 'Earlier', expenses: [] },
    ];

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const isToday = expenseDate.toDateString() === today.toDateString();
      const isYesterday = expenseDate.toDateString() === yesterday.toDateString();

      if (isToday) {
        groups[0].expenses.push(expense);
      } else if (isYesterday) {
        groups[1].expenses.push(expense);
      } else {
        groups[2].expenses.push(expense);
      }
    });

    // Filter out empty groups
    return groups.filter(group => group.expenses.length > 0);
  };

  const groupedExpenses = groupExpensesByDate(recentExpenses);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Main Input Card */}
        <Card className="p-8 bg-white shadow-sm">
          <div className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-semibold text-gray-400">
                  $
                </span>
                <Input
                  ref={amountInputRef}
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-3xl font-semibold pl-10 h-16 border-2 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category (optional)
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCategories ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      Loading categories...
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No categories available
                    </div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
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
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-12',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </>
                )}
              </Button>
              <Button
                onClick={clearForm}
                variant="outline"
                disabled={isSubmitting}
                className="h-12"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="text-xs text-gray-500 text-center pt-2">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded border">Enter</kbd> to submit •{' '}
              <kbd className="px-2 py-1 bg-gray-100 rounded border">Esc</kbd> to clear
            </div>
          </div>
        </Card>

        {/* Recent Expenses - Grouped by Date */}
        {groupedExpenses.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
            {isLoadingExpenses ? (
              <Card className="p-4 text-center text-sm text-gray-500">
                Loading expenses...
              </Card>
            ) : (
              groupedExpenses.map((group) => (
                <div key={group.label} className="space-y-2">
                  {/* Date Group Header */}
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {group.label}
                  </h3>

                  {/* Expenses in this group */}
                  <div className="space-y-2">
                    {group.expenses.map((expense) => (
                      <Card key={expense.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {expense.category && (
                                <div className="flex items-center gap-2">
                                  {expense.category.color && (
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: expense.category.color }}
                                    />
                                  )}
                                  {expense.category.icon && (
                                    <span className="text-lg">{expense.category.icon}</span>
                                  )}
                                  <span className="text-sm font-medium text-gray-700">
                                    {expense.category.name}
                                  </span>
                                </div>
                              )}
                              {!expense.category && (
                                <span className="text-sm text-gray-500">Uncategorized</span>
                              )}
                            </div>
                            {expense.description && (
                              <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(expense.date), 'MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

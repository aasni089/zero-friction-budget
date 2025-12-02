'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { createExpense, getExpenses, type Expense } from '@/lib/api/expense-client';
import { useRealtime } from '@/hooks/useRealtime';
import { ExpenseDetailsDialog } from './ExpenseDetailsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ExpenseInput() {
  const { currentHouseholdId } = useUiStore();

  // Form state
  const [amount, setAmount] = useState('');
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Data state
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  // Refs
  const amountInputRef = useRef<HTMLInputElement>(null);

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

  // Subscribe to real-time expense updates
  useRealtime({
    onExpenseCreated: (expense) => {
      // Add new expense to the list if it's not already there (avoid duplicates from own submissions)
      setRecentExpenses((prev) => {
        if (prev.find(e => e.id === expense.id)) {
          return prev;
        }
        return [expense, ...prev.slice(0, 9)];
      });
    },
  });

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

  // Handle amount submission - open details dialog
  const handleAmountSubmit = () => {
    const parsedAmount = parseFloat(amount);

    if (!amount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPendingAmount(parsedAmount);
    setIsDetailsDialogOpen(true);
  };

  // Handle full expense submission from details dialog
  const handleExpenseSubmit = async (details: {
    budgetId?: string;
    categoryId?: string;
    description?: string;
    date: Date;
  }) => {
    if (!currentHouseholdId) {
      toast.error('Please select a household');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create expense
      const response = await createExpense({
        amount: pendingAmount,
        budgetId: details.budgetId,
        categoryId: details.categoryId,
        description: details.description,
        date: details.date.toISOString(),
        householdId: currentHouseholdId,
      });

      // Success!
      toast.success(`Expense added: $${pendingAmount.toFixed(2)}`);

      // Optimistic update - add to recent expenses
      setRecentExpenses((prev) => [response, ...prev.slice(0, 9)]);

      // Clear form
      setAmount('');
      amountInputRef.current?.focus();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      toast.error('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to submit (if amount is filled)
      if (e.key === 'Enter' && !e.shiftKey && amount && !isDetailsDialogOpen) {
        e.preventDefault();
        handleAmountSubmit();
      }

      // Escape to clear
      if (e.key === 'Escape' && !isDetailsDialogOpen) {
        e.preventDefault();
        setAmount('');
        amountInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amount, isDetailsDialogOpen]);

  const isFormValid = amount && parseFloat(amount) > 0;

  // Group expenses by date
  const groupedExpenses = recentExpenses.reduce((groups, expense) => {
    const expenseDate = new Date(expense.date);
    let dateLabel = 'Earlier';

    if (isToday(expenseDate)) {
      dateLabel = 'Today';
    } else if (isYesterday(expenseDate)) {
      dateLabel = 'Yesterday';
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  const dateOrder = ['Today', 'Yesterday', 'Earlier'];

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Main Amount Input - ChatGPT Style */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-500">
                  $
                </span>
                <Input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={isSubmitting}
                  className="pl-10 pr-4 py-6 text-3xl font-semibold border-2 focus:border-blue-500 transition-colors"
                />
              </div>
              <Button
                onClick={handleAmountSubmit}
                disabled={!isFormValid || isSubmitting}
                size="lg"
                className="h-[60px] px-6 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Enter an amount and press Enter or click the arrow
            </p>
          </div>
        </div>
      </div>


      {/* Recent Expenses - Below centered input */}
      <div className="w-full max-w-2xl mx-auto px-4 pb-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
          {isLoadingExpenses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : recentExpenses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No expenses yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first expense above</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {dateOrder.map((dateLabel) => {
                const expenses = groupedExpenses[dateLabel];
                if (!expenses || expenses.length === 0) return null;

                return (
                  <div key={dateLabel}>
                    <h4 className="text-sm font-medium text-gray-500 mb-3">{dateLabel}</h4>
                    <div className="space-y-2">
                      {expenses.map((expense) => (
                        <Card key={expense.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expense.category?.color && (
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: expense.category.color }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {expense.description || expense.category?.name || 'Expense'}
                                </p>
                                {expense.category && (
                                  <p className="text-sm text-gray-500">{expense.category.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                ${expense.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(expense.date), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense Details Dialog */}
      <ExpenseDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        amount={pendingAmount}
        onSubmit={handleExpenseSubmit}
      />
    </div>
  );
}

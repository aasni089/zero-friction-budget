'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { useAuthStore } from '@/lib/stores/auth';
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

interface ExpenseInputProps {
  primaryBudgetId?: string;
  onExpenseCreated?: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ExpenseInput({ primaryBudgetId, onExpenseCreated, children }: ExpenseInputProps = {}) {
  const { currentHouseholdId } = useUiStore();
  const { user } = useAuthStore();

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
        limit: 5,
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
        return [expense, ...prev.slice(0, 4)];
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
      setRecentExpenses((prev) => [response, ...prev.slice(0, 4)]);

      // Clear form
      setAmount('');
      amountInputRef.current?.focus();

      // Call parent callback to refresh budget progress
      if (onExpenseCreated) {
        await onExpenseCreated();
      }
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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      {/* Main Content - Centered */}
      <div className="w-full max-w-xl space-y-8">
        {/* Greeting Text */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-lg text-muted-foreground">
            What would you like to track today?
          </p>
        </div>

        {/* Main Amount Input - ChatGPT Style */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl transition-all group-hover:bg-primary/10" />
          <div className="relative bg-card rounded-2xl shadow-lg border border-border/50 p-2 flex items-center transition-all focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50">
            <span className="pl-4 text-2xl font-medium text-muted-foreground select-none">
              $
            </span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              disabled={isSubmitting}
              className="w-full bg-transparent border-none outline-none text-3xl font-semibold p-3 focus:ring-0 placeholder:text-muted-foreground/30"
            />
            <Button
              onClick={handleAmountSubmit}
              disabled={!isFormValid || isSubmitting}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl mr-1 transition-all duration-300",
                isFormValid ? "bg-primary text-primary-foreground shadow-md hover:scale-105" : "bg-muted text-muted-foreground"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ArrowRight className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Budget Progress or other injected content */}
        {children}

        {/* Recent Expenses - Minimalist List */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          </div>

          {isLoadingExpenses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dateOrder.map((dateLabel) => {
                const expenses = groupedExpenses[dateLabel];
                if (!expenses || expenses.length === 0) return null;

                // Limit total items shown to 5 across all groups
                // This logic is a bit simplified for display purposes
                return (
                  <div key={dateLabel} className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground/70 px-2">{dateLabel}</h4>
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-base shadow-sm"
                            style={{
                              backgroundColor: expense.category?.color ? `${expense.category.color}20` : 'var(--muted)',
                              color: expense.category?.color || 'var(--foreground)'
                            }}
                          >
                            {expense.category?.icon || '💰'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {expense.description || expense.category?.name || 'Expense'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {expense.category?.name || 'Uncategorized'}
                              {expense.budget ? (
                                <>
                                  {' • '}
                                  {expense.budget.name}
                                </>
                              ) : expense.archivedBudgetName ? (
                                <>
                                  {' • '}
                                  <span className="text-red-500">{expense.archivedBudgetName} (Deleted)</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-foreground text-sm">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
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
        primaryBudgetId={primaryBudgetId}
        onSubmit={handleExpenseSubmit}
      />
    </div>
  );
}

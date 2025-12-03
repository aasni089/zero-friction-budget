'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/lib/stores/ui';
import { subscribeToHousehold } from '@/lib/supabase';
import type { Expense } from '@/lib/api/expense-client';
import type { Budget } from '@/lib/api/budget-client';

interface UseRealtimeOptions {
    onExpenseCreated?: (expense: Expense) => void;
    onExpenseUpdated?: (expense: Expense) => void;
    onExpenseDeleted?: (expenseId: string) => void;
    onBudgetUpdated?: (budget: Budget, action: 'created' | 'updated' | 'deleted') => void;
}

/**
 * Hook to subscribe to real-time updates for the current household
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
    const { currentHouseholdId } = useUiStore();

    useEffect(() => {
        if (!currentHouseholdId) {
            return;
        }

        const channel = subscribeToHousehold(currentHouseholdId, {
            onExpenseCreated: options.onExpenseCreated
                ? (payload) => options.onExpenseCreated!(payload.expense)
                : undefined,
            onExpenseUpdated: options.onExpenseUpdated
                ? (payload) => options.onExpenseUpdated!(payload.expense)
                : undefined,
            onExpenseDeleted: options.onExpenseDeleted
                ? (payload) => options.onExpenseDeleted!(payload.expenseId)
                : undefined,
            onBudgetUpdated: options.onBudgetUpdated
                ? (payload) => options.onBudgetUpdated!(payload.budget, payload.action)
                : undefined,
        });

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [currentHouseholdId, options.onExpenseCreated, options.onExpenseUpdated, options.onExpenseDeleted, options.onBudgetUpdated]);
}

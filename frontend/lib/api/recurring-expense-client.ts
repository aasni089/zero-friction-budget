import { api } from './client';

export interface RecurringExpense {
    id: string;
    amount: number;
    description?: string;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: string;
    endDate?: string;
    lastRun?: string;
    nextRun: string;
    categoryId?: string;
    category?: {
        id: string;
        name: string;
        icon?: string;
        color?: string;
    };
    budgetId?: string;
    householdId: string;
    userId: string;
    isActive: boolean;
}

export interface CreateRecurringExpenseData {
    amount: number;
    description?: string;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    householdId: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    monthOfYear?: number;
}

export interface UpdateRecurringExpenseData {
    amount?: number;
    description?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    isActive?: boolean;
    dayOfWeek?: number;
    dayOfMonth?: number;
    monthOfYear?: number;
}

export async function getRecurringExpenses(householdId: string) {
    return api.get<{ recurringExpenses: RecurringExpense[] }>(`/recurring-expenses?householdId=${householdId}`);
}

export async function createRecurringExpense(data: CreateRecurringExpenseData) {
    return api.post<RecurringExpense>('/recurring-expenses', data);
}

export async function updateRecurringExpense(id: string, data: UpdateRecurringExpenseData) {
    return api.patch<RecurringExpense>(`/recurring-expenses/${id}`, data);
}

export async function deleteRecurringExpense(id: string) {
    return api.delete<{ message: string }>(`/recurring-expenses/${id}`);
}

export async function toggleRecurringExpense(id: string) {
    return api.post<RecurringExpense>(`/recurring-expenses/${id}/toggle`, {});
}

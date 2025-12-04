// Expense API client for Zero Friction Budget

import { api } from './client';

export interface Expense {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description?: string;
  date: string;
  categoryId?: string;
  householdId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  budget?: {
    id: string;
    name: string;
    amount: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  archivedBudgetName?: string;
}

export interface CreateExpenseData {
  amount: number;
  description?: string;
  date: string;
  categoryId?: string;
  budgetId?: string;
  householdId: string;
}

export interface UpdateExpenseData {
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
}

export interface GetExpensesParams {
  householdId: string;
  limit?: number;
  offset?: number;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Expense Management
 */

// List expenses with optional filters
export async function getExpenses(params: GetExpensesParams) {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  return api.get<{ expenses: Expense[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(
    `/expenses?${queryParams.toString()}`
  );
}

// Get expense details
export async function getExpense(expenseId: string) {
  return api.get<Expense>(`/expenses/${expenseId}`);
}

// Create a new expense
export async function createExpense(data: CreateExpenseData) {
  return api.post<Expense>('/expenses', data);
}

// Update expense
export async function updateExpense(expenseId: string, data: UpdateExpenseData) {
  return api.patch<Expense>(`/expenses/${expenseId}`, data);
}

// Delete expense
export async function deleteExpense(expenseId: string) {
  return api.delete<{ message: string }>(`/expenses/${expenseId}`);
}

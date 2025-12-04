// Budget API client for Zero Friction Budget

import { api } from './client';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
  isPrimary?: boolean;
  categories?: BudgetCategory[];
  lineItems?: BudgetLineItem[];
  _count?: {
    expenses: number;
    categories: number;
  };
  progress?: {
    totalSpent: number;
    remaining: number;
    percentage: number;
    status: 'on_track' | 'warning' | 'over_budget';
  };
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  spent?: number; // Amount spent in this category for this budget
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

export interface BudgetLineItem {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

export interface CreateBudgetData {
  name: string;
  amount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  householdId: string;
  categories?: {
    categoryId: string;
    allocatedAmount: number;
  }[];
}

export interface UpdateBudgetData {
  name?: string;
  amount?: number;
  period?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  categoryId?: string | null;
  categories?: {
    categoryId: string;
    allocatedAmount: number;
  }[];
  isPrimary?: boolean;
}

/**
 * Budget Management
 */

// List all budgets for a household
export async function getBudgets(householdId: string) {
  return api.get<Budget[]>(`/budgets?householdId=${householdId}`);
}

// Get budget details
export async function getBudget(budgetId: string) {
  return api.get<Budget>(`/budgets/${budgetId}`);
}

// Create a new budget
export async function createBudget(data: CreateBudgetData) {
  return api.post<Budget>('/budgets', data);
}

// Update budget
export async function updateBudget(budgetId: string, data: UpdateBudgetData) {
  return api.patch<Budget>(`/budgets/${budgetId}`, data);
}

// Delete budget
export async function deleteBudget(budgetId: string) {
  return api.delete<{ message: string }>(`/budgets/${budgetId}`);
}

// Get primary budget for household
export async function getPrimaryBudget(householdId: string) {
  return api.get<Budget | null>(`/budgets/primary?householdId=${householdId}`);
}

// Set budget as primary
export async function setPrimaryBudget(budgetId: string, isPrimary: boolean) {
  return api.patch<Budget>(`/budgets/${budgetId}`, { isPrimary });
}

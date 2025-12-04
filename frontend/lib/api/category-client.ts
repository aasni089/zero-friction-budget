// Category API client for Zero Friction Budget

import { api } from './client';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  householdId: string;
  budgetId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    expenses: number;
  };
}

export interface CreateCategoryData {
  name: string;
  icon?: string;
  color?: string;
  householdId: string;
  budgetId?: string; // Optional: null = household-level, provided = budget-specific
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
}

export interface CategoryAnalytics {
  category: Category;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSpent: number;
    expenseCount: number;
    averagePerMonth: number;
    averagePerExpense: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  monthlyBreakdown: {
    month: string;
    total: number;
    count: number;
  }[];
  topSpenders: {
    userId: string;
    userName: string;
    total: number;
    count: number;
  }[];
}

/**
 * Category Management
 */

// List all categories for a household (optionally filtered by budget)
export async function getCategories(householdId: string, budgetId?: string, onlyLineItems?: boolean) {
  let url = `/categories?householdId=${householdId}`;
  if (budgetId) {
    url += `&budgetId=${budgetId}`;
  }
  if (onlyLineItems) {
    url += `&onlyLineItems=true`;
  }
  return api.get<{ categories: Category[] }>(url);
}

// Get category details
export async function getCategory(categoryId: string) {
  return api.get<Category>(`/categories/${categoryId}`);
}

// Create a new category
export async function createCategory(data: CreateCategoryData) {
  return api.post<Category>('/categories', data);
}

// Update category
export async function updateCategory(categoryId: string, data: UpdateCategoryData) {
  return api.patch<Category>(`/categories/${categoryId}`, data);
}

// Delete category
export async function deleteCategory(categoryId: string) {
  return api.delete<{ message: string }>(`/categories/${categoryId}`);
}

// Get category analytics
export async function getCategoryAnalytics(categoryId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return api.get<CategoryAnalytics>(`/categories/${categoryId}/analytics${queryString}`);
}

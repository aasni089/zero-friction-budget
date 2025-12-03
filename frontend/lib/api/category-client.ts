// Category API client for Zero Friction Budget

import { api } from './client';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  householdId: string;
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
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
}

/**
 * Category Management
 */

// List all categories for a household
export async function getCategories(householdId: string) {
  return api.get<{ categories: Category[] }>(`/categories?householdId=${householdId}`);
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

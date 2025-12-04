'use client';

import { CategoryList } from '@/components/category/CategoryList';

/**
 * Categories Page - Manage household-level categories
 *
 * This page allows users to create and manage categories at the household level.
 * These categories can be used across all budgets in the household.
 * Budget-specific categories are managed within the budget creation/edit dialogs.
 */
export default function CategoriesPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8">
            <CategoryList />
        </div>
    );
}
